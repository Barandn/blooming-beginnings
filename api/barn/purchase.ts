/**
 * POST /api/barn/purchase
 * Verify World App payment and grant game attempts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, barnGameAttempts, barnGamePurchases } from '../../lib/db';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth';
import { verifyPaymentTransaction } from '../../lib/services/payment-verification';
import { rateLimitCheck } from '../../lib/middleware/rate-limit';
import {
  API_STATUS,
  BARN_GAME_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants';

// Request validation schema
const purchaseSchema = z.object({
  paymentReference: z.string().min(1),
  transactionId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction ID format'),
  tokenSymbol: z.enum(['WLD', 'USDC']),
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

    // CRITICAL: Verify payment on blockchain
    const paymentVerification = await verifyPaymentTransaction(
      transactionId,
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

    // Get purchase price based on token
    const amount = tokenSymbol === 'WLD'
      ? BARN_GAME_CONFIG.purchasePriceWLD
      : BARN_GAME_CONFIG.purchasePriceUSDC;

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
        attemptsGranted: BARN_GAME_CONFIG.attemptsPerPurchase,
        confirmedAt: new Date(),
      })
      .returning();

    // Get or create barn game attempts record
    const [existingAttempts] = await db
      .select()
      .from(barnGameAttempts)
      .where(eq(barnGameAttempts.userId, auth.user.id))
      .limit(1);

    if (existingAttempts) {
      // Reset attempts and clear cooldown
      await db
        .update(barnGameAttempts)
        .set({
          attemptsRemaining: BARN_GAME_CONFIG.attemptsPerPurchase,
          cooldownStartedAt: null,
          cooldownEndsAt: null,
          hasActiveGame: false,
          totalCoinsWonToday: 0,
          matchesFoundToday: 0,
          updatedAt: new Date(),
        })
        .where(eq(barnGameAttempts.userId, auth.user.id));
    } else {
      // Create new record
      await db
        .insert(barnGameAttempts)
        .values({
          userId: auth.user.id,
          attemptsRemaining: BARN_GAME_CONFIG.attemptsPerPurchase,
        });
    }

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        purchaseId: purchase.id,
        attemptsGranted: BARN_GAME_CONFIG.attemptsPerPurchase,
        message: 'Game attempts successfully refilled!',
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
