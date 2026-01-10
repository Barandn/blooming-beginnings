/**
 * Leaderboard Service
 * Rankings based on monthly profit (higher = better)
 * Uses Drizzle ORM for database operations
 */

import { eq, sql, desc, and } from 'drizzle-orm';
import { db, gameScores, users, getCurrentPeriod } from '../db/index.js';

// Types
export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  monthlyProfit: number;
  totalScore: number;
  gamesPlayed: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  period: string;
  totalPlayers: number;
}

// Simple cache
const cache = new Map<string, { data: LeaderboardResult; expiry: number }>();
const CACHE_DURATION = 60 * 1000; // 60 seconds

/**
 * Mask wallet address for privacy (0x1234...5678)
 */
function maskWalletAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get leaderboard with caching
 */
export async function getLeaderboard(
  period?: string,
  limit: number = 100
): Promise<LeaderboardResult> {
  const targetPeriod = period || getCurrentPeriod();
  const cacheKey = `leaderboard:${targetPeriod}:${limit}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    // Query: Get all scores for the period with user data
    const scoresData = await db
      .select({
        userId: gameScores.userId,
        score: gameScores.score,
        monthlyProfit: gameScores.monthlyProfit,
        walletAddress: users.walletAddress,
      })
      .from(gameScores)
      .innerJoin(users, eq(gameScores.userId, users.id))
      .where(eq(gameScores.leaderboardPeriod, targetPeriod));

    // Aggregate scores by user
    const userScores = new Map<string, {
      walletAddress: string;
      totalScore: number;
      monthlyProfit: number;
      gamesPlayed: number;
    }>();

    for (const score of scoresData) {
      const userId = score.userId;
      const walletAddress = score.walletAddress || '';

      if (!userScores.has(userId)) {
        userScores.set(userId, {
          walletAddress,
          totalScore: 0,
          monthlyProfit: 0,
          gamesPlayed: 0,
        });
      }

      const userScore = userScores.get(userId)!;
      userScore.totalScore += score.score || 0;
      userScore.monthlyProfit += score.monthlyProfit || 0;
      userScore.gamesPlayed += 1;
    }

    // Convert to array and sort by monthly profit (descending)
    const sortedScores = Array.from(userScores.values())
      .sort((a, b) => b.monthlyProfit - a.monthlyProfit)
      .slice(0, limit);

    // Add ranks and mask wallet addresses
    const entries: LeaderboardEntry[] = sortedScores.map((entry, index) => ({
      rank: index + 1,
      walletAddress: maskWalletAddress(entry.walletAddress),
      monthlyProfit: entry.monthlyProfit,
      totalScore: entry.totalScore,
      gamesPlayed: entry.gamesPlayed,
    }));

    const result: LeaderboardResult = {
      entries,
      period: targetPeriod,
      totalPlayers: userScores.size,
    };

    // Cache result
    cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_DURATION });

    return result;
  } catch (error) {
    console.error('Leaderboard query error:', error);
    return { entries: [], period: targetPeriod, totalPlayers: 0 };
  }
}

/**
 * Get user's rank on leaderboard
 */
export async function getUserRank(
  userId: string,
  period?: string
): Promise<{ rank: number | null; entry: LeaderboardEntry | null }> {
  const targetPeriod = period || getCurrentPeriod();

  try {
    // Get user's scores for this period
    const userScoresData = await db
      .select({
        score: gameScores.score,
        monthlyProfit: gameScores.monthlyProfit,
        walletAddress: users.walletAddress,
      })
      .from(gameScores)
      .innerJoin(users, eq(gameScores.userId, users.id))
      .where(and(
        eq(gameScores.userId, userId),
        eq(gameScores.leaderboardPeriod, targetPeriod)
      ));

    if (!userScoresData || userScoresData.length === 0) {
      return { rank: null, entry: null };
    }

    // Calculate user's totals
    const walletAddress = userScoresData[0].walletAddress || '';
    const totalScore = userScoresData.reduce((sum, s) => sum + (s.score || 0), 0);
    const monthlyProfit = userScoresData.reduce((sum, s) => sum + (s.monthlyProfit || 0), 0);
    const gamesPlayed = userScoresData.length;

    // Get all users' monthly profits to calculate rank
    const allScoresData = await db
      .select({
        userId: gameScores.userId,
        monthlyProfit: gameScores.monthlyProfit,
      })
      .from(gameScores)
      .where(eq(gameScores.leaderboardPeriod, targetPeriod));

    // Aggregate all users' monthly profits
    const allUserProfits = new Map<string, number>();
    for (const score of allScoresData) {
      const current = allUserProfits.get(score.userId) || 0;
      allUserProfits.set(score.userId, current + (score.monthlyProfit || 0));
    }

    // Count users with higher profit
    let betterPlayers = 0;
    for (const [uid, profit] of allUserProfits) {
      if (uid !== userId && profit > monthlyProfit) {
        betterPlayers++;
      }
    }

    const rank = betterPlayers + 1;

    return {
      rank,
      entry: {
        rank,
        walletAddress: maskWalletAddress(walletAddress),
        monthlyProfit,
        totalScore,
        gamesPlayed,
      },
    };
  } catch (error) {
    console.error('User rank query error:', error);
    return { rank: null, entry: null };
  }
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats(period?: string): Promise<{
  totalPlayers: number;
  totalGames: number;
  totalProfit: number;
  averageProfit: number;
}> {
  const targetPeriod = period || getCurrentPeriod();

  try {
    const data = await db
      .select({
        userId: gameScores.userId,
        monthlyProfit: gameScores.monthlyProfit,
      })
      .from(gameScores)
      .where(eq(gameScores.leaderboardPeriod, targetPeriod));

    const uniqueUsers = new Set(data.map(d => d.userId));
    const totalProfit = data.reduce((sum, d) => sum + (d.monthlyProfit || 0), 0);

    return {
      totalPlayers: uniqueUsers.size,
      totalGames: data.length,
      totalProfit,
      averageProfit: uniqueUsers.size > 0 ? Math.round(totalProfit / uniqueUsers.size) : 0,
    };
  } catch (error) {
    console.error('Leaderboard stats error:', error);
    return {
      totalPlayers: 0,
      totalGames: 0,
      totalProfit: 0,
      averageProfit: 0,
    };
  }
}

/**
 * Get available leaderboard periods
 */
export function getAvailablePeriods(months: number = 6): string[] {
  const periods: string[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}-${month}`);
  }

  return periods;
}

/**
 * Clear leaderboard cache
 */
export function clearLeaderboardCache(): void {
  cache.clear();
}

// Re-export getCurrentPeriod for convenience
export { getCurrentPeriod };
