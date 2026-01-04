/**
 * POST /api/claim/daily-bonus
 * Claim daily token bonus with JWT authentication
 * Enforces 24-hour cooldown
 * Streak tracking stored in DB
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, claimTransactions, dailyBonusClaims, users } from '../../lib/db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import {
  getTokenDistributionService,
  formatTokenAmount,
} from '../../lib/services/token-distribution.js';
import { rateLimitCheck } from '../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  TOKEN_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants.js';

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get yesterday's date string
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Check if user has already claimed today from DB
 */
async function hasClaimedToday(userId: string): Promise<boolean> {
  const today = getTodayDate();

  const [claim] = await db
    .select()
    .from(dailyBonusClaims)
    .where(
      and(
        eq(dailyBonusClaims.userId, userId),
        eq(dailyBonusClaims.claimDate, today)
      )
    )
    .limit(1);

  return !!claim;
}

/**
 * Get last claim timestamp for cooldown check
 */
async function getLastClaimTimestamp(userId: string): Promise<Date | null> {
  const [lastClaim] = await db
    .select()
    .from(claimTransactions)
    .where(
      and(
        eq(claimTransactions.userId, userId),
        eq(claimTransactions.claimType, 'daily_bonus'),
        eq(claimTransactions.status, 'confirmed')
      )
    )
    .orderBy(desc(claimTransactions.createdAt))
    .limit(1);

  return lastClaim?.createdAt || null;
}

/**
 * Check 24-hour cooldown
 */
function isCooldownActive(lastClaimTime: Date | null): {
  active: boolean;
  remainingMs?: number;
} {
  if (!lastClaimTime) {
    return { active: false };
  }

  const now = Date.now();
  const lastClaim = lastClaimTime.getTime();
  const cooldownEnd = lastClaim + TOKEN_CONFIG.dailyClaimCooldown;

  if (now < cooldownEnd) {
    return {
      active: true,
      remainingMs: cooldownEnd - now,
    };
  }

  return { active: false };
}

/**
 * Calculate new streak count based on last claim date
 */
function calculateNewStreak(lastClaimDate: string | null, currentStreak: number): number {
  if (!lastClaimDate) {
    return 1; // First claim
  }

  const yesterday = getYesterdayDate();

  if (lastClaimDate === yesterday) {
    // Streak continues, wrap at 7
    return (currentStreak % 7) + 1;
  }

  // Streak broken, start over
  return 1;
}

/**
 * Calculate reward amount based on streak day
 */
function getStreakRewardAmount(streakDay: number): string {
  // Day 7 = 1000 coins (Golden Ball), otherwise 100 coins
  if (streakDay === 7) {
    return '1000000000000000000000'; // 1000 tokens in wei
  }
  return TOKEN_CONFIG.dailyBonusAmount; // 100 tokens
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
    // Authenticate user via JWT
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Step 1: Check if already claimed today (from DB)
    const alreadyClaimed = await hasClaimedToday(auth.user.id);
    if (alreadyClaimed) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.COOLDOWN_ACTIVE,
        errorCode: 'already_claimed_today',
      });
    }

    // Step 2: Check 24-hour cooldown
    const lastClaimTime = await getLastClaimTimestamp(auth.user.id);
    const cooldown = isCooldownActive(lastClaimTime);

    if (cooldown.active) {
      const remainingHours = Math.ceil((cooldown.remainingMs || 0) / (1000 * 60 * 60));
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: `Daily bonus on cooldown. Try again in ${remainingHours} hours.`,
        errorCode: 'cooldown_active',
        remainingMs: cooldown.remainingMs,
      });
    }

    // Step 3: Get current streak from DB
    const [userData] = await db
      .select({
        dailyStreakCount: users.dailyStreakCount,
        lastDailyClaimDate: users.lastDailyClaimDate,
      })
      .from(users)
      .where(eq(users.id, auth.user.id))
      .limit(1);

    const currentStreak = userData?.dailyStreakCount || 0;
    const lastClaimDate = userData?.lastDailyClaimDate || null;

    // Calculate new streak
    const newStreak = calculateNewStreak(lastClaimDate, currentStreak);
    const rewardAmount = getStreakRewardAmount(newStreak);
    const today = getTodayDate();

    // Step 4: Create pending transaction record
    const [transaction] = await db
      .insert(claimTransactions)
      .values({
        userId: auth.user.id,
        claimType: 'daily_bonus',
        amount: rewardAmount,
        tokenAddress: TOKEN_CONFIG.tokenAddress,
        status: 'pending',
      } as typeof claimTransactions.$inferInsert)
      .returning();

    // Step 5: Execute token transfer
    const distributionService = getTokenDistributionService();

    if (!distributionService.isReady()) {
      // Token distribution not configured - mark as pending but still update streak
      await db
        .update(claimTransactions)
        .set({
          status: 'pending',
          errorMessage: 'Token distribution not configured',
        } as Partial<typeof claimTransactions.$inferInsert>)
        .where(eq(claimTransactions.id, transaction.id));

      // Record the daily claim and update streak in DB
      await db.insert(dailyBonusClaims).values({
        userId: auth.user.id,
        claimDate: today,
        amount: rewardAmount,
        transactionId: transaction.id,
      } as typeof dailyBonusClaims.$inferInsert);

      // Update user streak in DB
      await db
        .update(users)
        .set({
          dailyStreakCount: newStreak,
          lastDailyClaimDate: today,
          updatedAt: new Date(),
        })
        .where(eq(users.id, auth.user.id));

      return res.status(200).json({
        status: API_STATUS.PENDING,
        message: 'Claim recorded but token transfer pending',
        data: {
          claimId: transaction.id,
          amount: formatTokenAmount(rewardAmount),
          streakDay: newStreak,
          status: 'pending',
        },
      });
    }

    const transferResult = await distributionService.distributeDailyBonus(
      auth.user.walletAddress,
      auth.user.id
    );

    if (!transferResult.success) {
      // Update transaction as failed
      await db
        .update(claimTransactions)
        .set({
          status: 'failed',
          errorMessage: transferResult.error,
        } as Partial<typeof claimTransactions.$inferInsert>)
        .where(eq(claimTransactions.id, transaction.id));

      return res.status(500).json({
        status: API_STATUS.ERROR,
        error: transferResult.error || ERROR_MESSAGES.CLAIM_FAILED,
        errorCode: transferResult.errorCode,
      });
    }

    // Step 6: Update transaction as confirmed
    await db
      .update(claimTransactions)
      .set({
        status: 'confirmed',
        txHash: transferResult.txHash,
        blockNumber: transferResult.blockNumber,
        confirmedAt: new Date(),
      } as Partial<typeof claimTransactions.$inferInsert>)
      .where(eq(claimTransactions.id, transaction.id));

    // Step 7: Record daily bonus claim
    await db.insert(dailyBonusClaims).values({
      userId: auth.user.id,
      claimDate: today,
      amount: rewardAmount,
      transactionId: transaction.id,
    } as typeof dailyBonusClaims.$inferInsert);

    // Step 8: Update user streak in DB
    await db
      .update(users)
      .set({
        dailyStreakCount: newStreak,
        lastDailyClaimDate: today,
        updatedAt: new Date(),
      })
      .where(eq(users.id, auth.user.id));

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        claimId: transaction.id,
        amount: formatTokenAmount(rewardAmount),
        streakDay: newStreak,
        txHash: transferResult.txHash,
        blockNumber: transferResult.blockNumber,
        explorerUrl: `https://worldscan.org/tx/${transferResult.txHash}`,
      },
    });
  } catch (error) {
    console.error('Daily bonus claim error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
