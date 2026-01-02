/**
 * POST /api/scores/submit
 * Submit game score with server-side validation
 * Distributes token rewards on successful game completion
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { validateAndSaveScore, type ScoreSubmission } from '../../lib/services/score-validation.js';
import { clearLeaderboardCache } from '../../lib/services/leaderboard.js';
import { getTokenDistributionService, formatTokenAmount } from '../../lib/services/token-distribution.js';
import { db, claimTransactions } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';
import { API_STATUS, ERROR_MESSAGES, TOKEN_CONFIG } from '../../lib/config/constants.js';

// Request validation schema
const scoreSchema = z.object({
  gameType: z.enum(['card_match']),
  score: z.number().int().min(0),
  monthlyProfit: z.number().int().min(0),
  sessionId: z.string().uuid().optional(),
  gameStartedAt: z.number().positive(),
  gameEndedAt: z.number().positive(),
  validationData: z.record(z.unknown()).optional(),
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
    const parseResult = scoreSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // Validate time ordering
    if (data.gameEndedAt <= data.gameStartedAt) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Invalid game timing',
        errorCode: 'invalid_timing',
      });
    }

    // Create submission object
    const submission: ScoreSubmission = {
      userId: auth.user.id,
      gameType: data.gameType,
      score: data.score,
      monthlyProfit: data.monthlyProfit,
      sessionId: data.sessionId,
      gameStartedAt: data.gameStartedAt,
      gameEndedAt: data.gameEndedAt,
      validationData: data.validationData,
    };

    // Validate and save score
    const result = await validateAndSaveScore(submission);

    if (!result.valid) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: result.error,
        errorCode: result.errorCode,
        flags: result.flags,
      });
    }

    // Clear leaderboard cache since scores changed
    clearLeaderboardCache();

    // Distribute game reward tokens
    let rewardTxHash: string | undefined;
    let rewardAmount: string | undefined;
    let rewardError: string | undefined;

    if (result.score && data.score > 0) {
      try {
        const distributionService = getTokenDistributionService();

        if (distributionService.isReady()) {
          // Calculate reward amount based on score
          const rewardAmountWei = (BigInt(data.score) * TOKEN_CONFIG.gameRewardMultiplier).toString();

          // Create pending transaction record
          const [transaction] = await db
            .insert(claimTransactions)
            .values({
              userId: auth.user.id,
              claimType: 'game_reward',
              amount: rewardAmountWei,
              tokenAddress: TOKEN_CONFIG.tokenAddress,
              status: 'pending',
            } as typeof claimTransactions.$inferInsert)
            .returning();

          // Execute token transfer
          const transferResult = await distributionService.distributeGameReward(
            auth.user.walletAddress,
            data.score,
            auth.user.id
          );

          if (transferResult.success) {
            // Update transaction as confirmed
            await db
              .update(claimTransactions)
              .set({
                status: 'confirmed',
                txHash: transferResult.txHash,
                blockNumber: transferResult.blockNumber,
                confirmedAt: new Date(),
              } as Partial<typeof claimTransactions.$inferInsert>)
              .where(eq(claimTransactions.id, transaction.id));

            rewardTxHash = transferResult.txHash;
            rewardAmount = formatTokenAmount(rewardAmountWei);
          } else {
            // Update transaction as failed
            await db
              .update(claimTransactions)
              .set({
                status: 'failed',
                errorMessage: transferResult.error,
              } as Partial<typeof claimTransactions.$inferInsert>)
              .where(eq(claimTransactions.id, transaction.id));

            rewardError = transferResult.error;
            console.error('Game reward distribution failed:', transferResult.error);
          }
        } else {
          console.warn('Token distribution service not ready - skipping game reward');
          rewardError = 'Token distribution not configured';
        }
      } catch (rewardErr) {
        console.error('Error distributing game reward:', rewardErr);
        rewardError = 'Failed to distribute reward';
      }
    }

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        scoreId: result.score?.id,
        score: result.score?.score,
        monthlyProfit: result.score?.monthlyProfit,
        leaderboardPeriod: result.score?.leaderboardPeriod,
        flags: result.flags,
        reward: rewardTxHash ? {
          amount: rewardAmount,
          txHash: rewardTxHash,
          explorerUrl: `https://worldscan.org/tx/${rewardTxHash}`,
        } : undefined,
        rewardError,
      },
    });
  } catch (error) {
    console.error('Score submission error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
