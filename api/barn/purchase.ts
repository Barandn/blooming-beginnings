/**
 * POST /api/barn/purchase
 * Verify World App payment and grant Play Pass (1 hour unlimited play)
 *
 * Play Pass System:
 * - 1 WLD = 1 hour unlimited play
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, barnGameAttempts, barnGamePurchases, paymentReferences } from '../../lib/db/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { verifyPaymentCombined } from '../../lib/services/payment-verification.js';
import { rateLimitCheck } from '../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  BARN_GAME_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants.js';

// Request validation schema
const purchaseSchema = z.object({
  paymentReference: z.string().min(1),
  transactionId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction ID format'),
  tokenSymbol: z.literal('WLD'), // Only WLD supported for Play Pass
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
    // Authenticate user
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Validate request body
    const parseResult = purchaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const { paymentReference, transactionId, tokenSymbol } = parseResult.data;

    // Check if payment reference already used
    const [existingPurchase] = await db
      .select()
      .from(barnGamePurchases)
      .where(eq(barnGamePurchases.paymentReference, paymentReference))
      .limit(1);

    if (existingPurchase) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Payment already processed',
        errorCode: 'duplicate_payment',
      });
    }

    // Check if transaction ID already used (prevent replay attacks)
    const [existingTx] = await db
      .select()
      .from(barnGamePurchases)
      .where(eq(barnGamePurchases.transactionId, transactionId))
      .limit(1);

    if (existingTx) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Transaction already used for a previous purchase',
        errorCode: 'duplicate_transaction',
      });
    }

    // Validate payment reference exists and is not expired
    const [storedReference] = await db
      .select()
      .from(paymentReferences)
      .where(
        and(
          eq(paymentReferences.referenceId, paymentReference),
          eq(paymentReferences.userId, auth.user.id),
          gt(paymentReferences.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!storedReference) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Invalid or expired payment reference',
        errorCode: 'invalid_reference',
      });
    }

    // Validate recipient address is configured
    const recipientAddress = BARN_GAME_CONFIG.recipientAddress;
    if (!recipientAddress) {
      console.error('BARN_GAME_RECIPIENT_ADDRESS not configured');
      return res.status(500).json({
        status: API_STATUS.ERROR,
        error: 'Payment configuration error',
        errorCode: 'config_error',
      });
    }

    // CRITICAL: Verify payment using Developer Portal API with blockchain fallback
    const paymentVerification = await verifyPaymentCombined(
      transactionId,
      paymentReference,
      recipientAddress,
      tokenSymbol
    );

    if (!paymentVerification.verified) {
      // If pending, tell user to wait
      if (paymentVerification.errorCode === 'pending') {
        return res.status(202).json({
          status: API_STATUS.PENDING,
          error: paymentVerification.error,
          errorCode: paymentVerification.errorCode,
          confirmations: paymentVerification.confirmations,
          message: 'Payment is being processed. Please try again in a few seconds.',
        });
      }

      // Other verification failures
      console.error('Payment verification failed:', paymentVerification);
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: paymentVerification.error || 'Payment verification failed',
        errorCode: paymentVerification.errorCode || 'verification_failed',
      });
    }

    const amount = BARN_GAME_CONFIG.purchasePriceWLD;
    const playPassDuration = BARN_GAME_CONFIG.playPassDuration;
    const now = Date.now();
    const playPassExpiresAt = new Date(now + playPassDuration);

    // Mark payment reference as used
    await db
      .update(paymentReferences)
      .set({ status: 'completed' })
      .where(eq(paymentReferences.referenceId, paymentReference));

    // Record the verified purchase
    const [purchase] = await db
      .insert(barnGamePurchases)
      .values({
        userId: auth.user.id,
        paymentReference,
        transactionId,
        amount: paymentVerification.amount || amount,
        tokenSymbol,
        status: 'confirmed',
        playPassDurationMs: playPassDuration,
        confirmedAt: new Date(),
      } as typeof barnGamePurchases.$inferInsert)
      .returning();

    // Get or create barn game record
    const [existingRecord] = await db
      .select()
      .from(barnGameAttempts)
      .where(eq(barnGameAttempts.userId, auth.user.id))
      .limit(1);

    if (existingRecord) {
      // Grant Play Pass - clear cooldown and set expiration
      await db
        .update(barnGameAttempts)
        .set({
          playPassExpiresAt,
          playPassPurchasedAt: new Date(),
          cooldownEndsAt: null,
          freeGameUsed: false,
          hasActiveGame: false,
          updatedAt: new Date(),
        } as Partial<typeof barnGameAttempts.$inferInsert>)
        .where(eq(barnGameAttempts.userId, auth.user.id));
    } else {
      // Create new record with Play Pass
      await db
        .insert(barnGameAttempts)
        .values({
          userId: auth.user.id,
          playPassExpiresAt,
          playPassPurchasedAt: new Date(),
        } as typeof barnGameAttempts.$inferInsert);
    }

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        purchaseId: purchase.id,
        playPassExpiresAt: playPassExpiresAt.getTime(),
        playPassDurationMs: playPassDuration,
        message: 'Play Pass activated! You have 1 hour of unlimited play.',
      },
    });
  } catch (error) {
    console.error('Barn game purchase error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
