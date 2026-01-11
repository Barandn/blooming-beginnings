/**
 * POST /api/auth/siwe/verify
 * Verify SIWE signature from World App Wallet Auth
 *
 * Simple SIWE implementation following World App MiniKit guidelines
 * Uses Drizzle ORM for database operations
 * Reference: https://docs.world.org/mini-apps/commands/wallet-auth
 *
 * World App uses Safe addresses for SIWE, requiring ERC-1271 signature verification
 */

import type { ApiRequest, ApiResponse } from '../../../lib/types/http.js';
import { z } from 'zod';
import { ethers } from 'ethers';
import { eq } from 'drizzle-orm';
import { db, users } from '../../../lib/db/index.js';
import { SignJWT } from 'jose';
import { validateAndConsumeNonce } from './nonce.js';
import {
  API_STATUS,
  ERROR_MESSAGES,
  SESSION_CONFIG,
  WORLD_CHAIN,
} from '../../../lib/config/constants.js';

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
    const rpcUrl = process.env.WORLD_CHAIN_RPC_URL || WORLD_CHAIN.MAINNET.rpcUrl;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(address, ERC1271_ABI, provider);
    const messageHash = ethers.hashMessage(message);
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
  const nonceMatch = message.match(/Nonce:\s*([a-zA-Z0-9]+)/i);
  return nonceMatch ? nonceMatch[1] : null;
}

/**
 * Get JWT secret as Uint8Array
 */
function getJwtSecret(): Uint8Array {
  const secret = SESSION_CONFIG.jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a simple JWT token
 */
async function createToken(userId: string, walletAddress: string): Promise<string> {
  return await new SignJWT({
    userId,
    walletAddress,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_CONFIG.tokenExpiry)
    .sign(getJwtSecret());
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

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
    const nonceValid = await validateAndConsumeNonce(nonce);
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
    const walletAddressLower = address.toLowerCase();

    // Try to find existing user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddressLower),
    });

    let user = existingUser;
    let isNewUser = false;

    if (!existingUser) {
      // Create new user with wallet address
      const walletNullifier = `wallet_${walletAddressLower}`;

      const [newUser] = await db
        .insert(users)
        .values({
          nullifierHash: walletNullifier,
          walletAddress: walletAddressLower,
          verificationLevel: 'wallet',
          lastLoginAt: new Date().toISOString(),
        })
        .returning();

      if (!newUser) {
        console.error('Failed to create user');
        return res.status(500).json({
          status: API_STATUS.ERROR,
          error: 'Failed to create user',
        });
      }

      user = newUser;
      isNewUser = true;
    } else {
      // Update last login
      await db
        .update(users)
        .set({
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, existingUser.id));
    }

    // Step 5: Create JWT token (no session table needed)
    const token = await createToken(user!.id, user!.walletAddress);
    const expiresAt = new Date(Date.now() + SESSION_CONFIG.sessionDuration);

    // Return success response
    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        isNewUser,
        token,
        user: {
          id: user!.id,
          walletAddress: user!.walletAddress,
          verificationLevel: user!.verificationLevel,
          createdAt: user!.createdAt,
        },
        expiresAt,
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
