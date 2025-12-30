/**
 * GET /api/user/profile
 * Get authenticated user's profile and stats
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, claimTransactions, gameScores, dailyBonusClaims } from '../../lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth';
import { getCurrentPeriod, getUserMonthlyProfit } from '../../lib/services/score-validation';
import { getUserRank } from '../../lib/services/leaderboard';
import { formatTokenAmount } from '../../lib/services/token-distribution';
import { API_STATUS, ERROR_MESSAGES, TOKEN_CONFIG } from '../../lib/config/constants';

/**
 * Get today's date string
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  try {
    // Require authentication
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    const user = auth.user;

    // Get total tokens claimed
    const [claimStats] = await db
      .select({
        totalClaimed: sql<string>`COALESCE(SUM(CAST(${claimTransactions.amount} AS NUMERIC)), 0)`,
        claimCount: sql<number>`COUNT(*)::integer`,
      })
      .from(claimTransactions)
      .where(
        and(
          eq(claimTransactions.userId, user.id),
          eq(claimTransactions.status, 'confirmed')
        )
      );

    // Get game statistics
    const [gameStats] = await db
      .select({
        totalGames: sql<number>`COUNT(*)::integer`,
        totalScore: sql<number>`COALESCE(SUM(${gameScores.score}), 0)::integer`,
        bestScore: sql<number>`COALESCE(MAX(${gameScores.score}), 0)::integer`,
      })
      .from(gameScores)
      .where(
        and(
          eq(gameScores.userId, user.id),
          eq(gameScores.isValidated, true)
        )
      );

    // Check daily bonus status
    const [todayClaim] = await db
      .select()
      .from(dailyBonusClaims)
      .where(
        and(
          eq(dailyBonusClaims.userId, user.id),
          eq(dailyBonusClaims.claimDate, getTodayDate())
        )
      )
      .limit(1);

    // Get last claim for cooldown
    const [lastClaim] = await db
      .select()
      .from(claimTransactions)
      .where(
        and(
          eq(claimTransactions.userId, user.id),
          eq(claimTransactions.claimType, 'daily_bonus'),
          eq(claimTransactions.status, 'confirmed')
        )
      )
      .orderBy(desc(claimTransactions.createdAt))
      .limit(1);

    // Calculate cooldown
    let dailyBonusAvailable = !todayClaim;
    let cooldownRemaining = 0;

    if (lastClaim) {
      const lastClaimTime = new Date(lastClaim.createdAt).getTime();
      const cooldownEnd = lastClaimTime + TOKEN_CONFIG.dailyClaimCooldown;
      const now = Date.now();

      if (now < cooldownEnd) {
        dailyBonusAvailable = false;
        cooldownRemaining = cooldownEnd - now;
      }
    }

    // Get current month rank
    const currentPeriod = getCurrentPeriod();
    const { rank } = await getUserRank(user.id, currentPeriod);
    const monthlyProfit = await getUserMonthlyProfit(user.id, currentPeriod);

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: claimTransactions.id,
        claimType: claimTransactions.claimType,
        amount: claimTransactions.amount,
        status: claimTransactions.status,
        txHash: claimTransactions.txHash,
        createdAt: claimTransactions.createdAt,
      })
      .from(claimTransactions)
      .where(eq(claimTransactions.userId, user.id))
      .orderBy(desc(claimTransactions.createdAt))
      .limit(10);

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          verificationLevel: user.verificationLevel,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        stats: {
          totalTokensClaimed: formatTokenAmount(claimStats?.totalClaimed || '0'),
          claimCount: claimStats?.claimCount || 0,
          totalGamesPlayed: gameStats?.totalGames || 0,
          totalScore: gameStats?.totalScore || 0,
          bestScore: gameStats?.bestScore || 0,
          currentMonthRank: rank,
          currentMonthProfit: monthlyProfit,
        },
        dailyBonus: {
          available: dailyBonusAvailable,
          claimedToday: !!todayClaim,
          cooldownRemainingMs: cooldownRemaining,
          amount: formatTokenAmount(TOKEN_CONFIG.dailyBonusAmount),
        },
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          type: tx.claimType,
          amount: formatTokenAmount(tx.amount),
          status: tx.status,
          txHash: tx.txHash,
          explorerUrl: tx.txHash ? `https://worldscan.org/tx/${tx.txHash}` : null,
          createdAt: tx.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
