/**
 * POST /api/auth/siwe/verify
 * Verify SIWE signature from World App Wallet Auth
 *
 * This replaces the deprecated World ID Sign-In flow
 * Reference: https://docs.world.org/world-id/sign-in/deprecation
 *
 * World App uses Safe addresses for SIWE, requiring ERC-1271 signature verification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { ethers } from 'ethers';
import { db, users } from '../../../lib/db/index.js';
import { eq } from 'drizzle-orm';
import {
  createSessionToken,
  createSession,
  type SessionData,
} from '../../../lib/services/auth.js';
import { rateLimitCheck } from '../../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  ERROR_MESSAGES,
  SESSION_CONFIG,
  WORLD_CHAIN,
} from '../../../lib/config/constants.js';
import { validateAndConsumeNonce } from './nonce.js';

// Request validation schema
const verifySchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().min(1, 'Signature is required'),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  nonce: z.string().min(8, 'Nonce must be at least 8 characters'),
});

// ERC-1271 magic value for valid signature
const ERC1271_MAGIC_VALUE = '0x1626ba7e';

// ERC-1271 ABI for isValidSignature
const ERC1271_ABI = [
  'function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)',
];

/**
 * Verify signature using ERC-1271 (for Smart Contract Wallets like Safe)
 * World App uses Safe addresses, so we need to verify against the contract
 */
async function verifyERC1271Signature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // Create provider for World Chain
    const rpcUrl = process.env.WORLD_CHAIN_RPC_URL || WORLD_CHAIN.MAINNET.rpcUrl;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Create contract instance
    const contract = new ethers.Contract(address, ERC1271_ABI, provider);

    // Hash the message according to EIP-191
    const messageHash = ethers.hashMessage(message);

    // Call isValidSignature on the contract
    const result = await contract.isValidSignature(messageHash, signature);

    return result === ERC1271_MAGIC_VALUE;
  } catch (error) {
    console.error('ERC-1271 verification error:', error);
    return false;
  }
}

/**
 * Verify signature - tries EOA first, then ERC-1271
 */
async function verifySiweSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  // First try standard EOA verification
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
      return true;
    }
  } catch {
    // EOA verification failed, try ERC-1271
  }

  // Try ERC-1271 verification (for Safe wallets used by World App)
  return verifyERC1271Signature(address, message, signature);
}

/**
 * Parse SIWE message to extract nonce
 */
function extractNonceFromMessage(message: string): string | null {
  // SIWE message format includes "Nonce: <nonce>"
  const nonceMatch = message.match(/Nonce:\s*([a-zA-Z0-9]+)/i);
  return nonceMatch ? nonceMatch[1] : null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  // Check rate limit
  const rateLimited = rateLimitCheck(req, res);
  if (rateLimited) return rateLimited;

  try {
    // Validate request body
    const parseResult = verifySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const { message, signature, address, nonce } = parseResult.data;

    // Step 1: Validate nonce from message matches the one we sent
    const messageNonce = extractNonceFromMessage(message);
    if (!messageNonce || messageNonce !== nonce) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Nonce mismatch',
        errorCode: 'nonce_mismatch',
      });
    }

    // Step 2: Validate and consume nonce (one-time use)
    const nonceValid = validateAndConsumeNonce(nonce);
    if (!nonceValid) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Invalid or expired nonce. Please try again.',
        errorCode: 'invalid_nonce',
      });
    }

    // Step 3: Verify signature
    const signatureValid = await verifySiweSignature(address, message, signature);
    if (!signatureValid) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_SIGNATURE,
        errorCode: 'invalid_signature',
      });
    }

    // Step 4: Find or create user by wallet address
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, address.toLowerCase()))
      .limit(1);

    let isNewUser = false;

    if (!existingUser) {
      // Create new user with wallet address
      // Note: Without World ID, we use wallet address as the unique identifier
      // and generate a placeholder nullifier hash
      const walletNullifier = `wallet_${address.toLowerCase()}`;

      const [newUser] = await db
        .insert(users)
        .values({
          nullifierHash: walletNullifier,
          walletAddress: address.toLowerCase(),
          verificationLevel: 'wallet', // Wallet-based auth, not Orb verified
          merkleRoot: null,
          lastLoginAt: new Date(),
        } as typeof users.$inferInsert)
        .returning();

      existingUser = newUser;
      isNewUser = true;
    } else {
      // Update last login
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        } as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, existingUser.id));
    }

    // Step 5: Create session
    const sessionData: SessionData = {
      userId: existingUser.id,
      walletAddress: existingUser.walletAddress,
      nullifierHash: existingUser.nullifierHash,
      expiresAt: new Date(Date.now() + SESSION_CONFIG.sessionDuration),
    };

    const token = await createSessionToken(sessionData);

    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress ||
      undefined;

    const session = await createSession(
      existingUser.id,
      token,
      existingUser.walletAddress,
      { userAgent, ipAddress }
    );

    // Return success response
    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        isNewUser,
        token,
        user: {
          id: existingUser.id,
          walletAddress: existingUser.walletAddress,
          verificationLevel: existingUser.verificationLevel,
          createdAt: existingUser.createdAt,
        },
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('SIWE verification error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
