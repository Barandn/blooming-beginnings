/**
 * POST /api/barn/initiate-payment
 * Creates a secure payment reference ID for World App payments
 *
 * Play Pass System:
 * - 1 WLD = 1 hour unlimited play
 *
 * This endpoint follows World App MiniKit best practices:
 * - Reference IDs are generated server-side (prevents manipulation)
 * - Includes expiration time to prevent replay attacks
 * - Returns merchant wallet address from secure config
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, paymentReferences } from '../../lib/db/index.js';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { rateLimitCheck } from '../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  BARN_GAME_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants.js';
import { randomBytes } from 'crypto';

// Request validation schema
const initiatePaymentSchema = z.object({
  tokenSymbol: z.literal('WLD'), // Only WLD supported for Play Pass
  itemType: z.literal('play_pass'),
});

// Payment reference expiration time (5 minutes)
const REFERENCE_EXPIRY_MS = 5 * 60 * 1000;

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
    // Authenticate user
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Validate request body
    const parseResult = initiatePaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const { tokenSymbol, itemType } = parseResult.data;

    // Validate merchant wallet is configured
    const merchantWallet = BARN_GAME_CONFIG.recipientAddress;
    if (!merchantWallet) {
      console.error('BARN_GAME_RECIPIENT_ADDRESS not configured');
      return res.status(500).json({
        status: API_STATUS.ERROR,
        error: 'Payment configuration error',
        errorCode: 'config_error',
      });
    }

    // Generate secure reference ID (32 hex chars = 16 bytes)
    // Format matches World App expected format
    const referenceId = randomBytes(16).toString('hex');

    // Get price (1 WLD for Play Pass)
    const amount = BARN_GAME_CONFIG.purchasePriceWLD;

    // Calculate expiration time
    const expiresAt = Date.now() + REFERENCE_EXPIRY_MS;

    // Store payment reference in database
    await db
      .insert(paymentReferences)
      .values({
        referenceId,
        userId: auth.user.id,
        amount,
        tokenSymbol,
        itemType,
        status: 'pending',
        expiresAt: new Date(expiresAt),
      } as typeof paymentReferences.$inferInsert);

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        referenceId,
        merchantWallet,
        amount,
        tokenSymbol,
        expiresAt,
        playPassDurationMs: BARN_GAME_CONFIG.playPassDuration,
      },
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
