/**
 * POST /api/verify/world-id
 * Verify World ID proof and register/login user
 * Enforces Orb-only verification policy
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, users } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';
import {
  verifyWorldIDWithOrbPolicy,
  getWorldIDErrorMessage,
  type WorldIDProof,
} from '../../lib/services/worldid.js';
import { createSessionToken, createSession, type SessionData } from '../../lib/services/auth.js';
import { rateLimitCheck } from '../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  WORLD_ID,
  ERROR_MESSAGES,
  SESSION_CONFIG,
} from '../../lib/config/constants.js';

// Request validation schema
const verifySchema = z.object({
  proof: z.object({
    proof: z.string(),
    merkle_root: z.string(),
    nullifier_hash: z.string(),
    verification_level: z.enum(['orb', 'device']),
  }),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  action: z.string().optional(),
  signal: z.string().optional(),
});

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

    const { proof, walletAddress, action, signal } = parseResult.data;

    // Step 1: Verify World ID with Orb-only policy
    const verificationAction = action || WORLD_ID.verifyAction;
    const verifyResult = await verifyWorldIDWithOrbPolicy(
      proof as WorldIDProof,
      verificationAction,
      signal
    );

    if (!verifyResult.success) {
      const errorMessage = verifyResult.errorCode
        ? getWorldIDErrorMessage(verifyResult.errorCode)
        : verifyResult.error;

      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: errorMessage,
        errorCode: verifyResult.errorCode,
      });
    }

    const nullifierHash = verifyResult.nullifier_hash!;

    // Step 2: Check if user already exists with this nullifier
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.nullifierHash, nullifierHash))
      .limit(1);

    let isNewUser = false;

    if (existingUser) {
      // User exists - check if wallet address matches
      if (existingUser.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        // Different wallet trying to use same World ID
        return res.status(400).json({
          status: API_STATUS.ERROR,
          error: 'This World ID is already linked to a different wallet',
          errorCode: 'wallet_mismatch',
        });
      }

      // Update last login and merkle root
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          merkleRoot: proof.merkle_root,
          updatedAt: new Date(),
        } as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, existingUser.id));
    } else {
      // Check if wallet is already registered with different nullifier
      const [walletUser] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (walletUser) {
        return res.status(400).json({
          status: API_STATUS.ERROR,
          error: 'This wallet is already registered with a different World ID',
          errorCode: 'duplicate_wallet',
        });
      }

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          nullifierHash,
          walletAddress: walletAddress.toLowerCase(),
          verificationLevel: 'orb',
          merkleRoot: proof.merkle_root,
          lastLoginAt: new Date(),
        } as typeof users.$inferInsert)
        .returning();

      existingUser = newUser;
      isNewUser = true;
    }

    // Step 3: Create session
    const sessionData: SessionData = {
      userId: existingUser.id,
      walletAddress: existingUser.walletAddress,
      nullifierHash: existingUser.nullifierHash,
      expiresAt: new Date(Date.now() + SESSION_CONFIG.sessionDuration),
    };

    const token = await createSessionToken(sessionData);

    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress || undefined;

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
    console.error('World ID verification error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
