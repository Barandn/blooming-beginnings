/**
 * Leaderboard Service
 * Rankings based on moves and time (fewer moves + faster time = better)
 */

import { db, gameScores, users } from '../db';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { getCurrentPeriod } from './score-validation';

// Types
export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  bestMoves: number;
  bestTime: number;
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

  // Query: Get each user's best score (minimum moves, then minimum time for tie-break)
  // Using a subquery to get each user's best game
  const leaderboardData = await db
    .select({
      walletAddress: users.walletAddress,
      bestMoves: sql<number>`MIN(${gameScores.moves})`,
      bestTime: sql<number>`MIN(${gameScores.timeSeconds})`,
      gamesPlayed: sql<number>`COUNT(*)::integer`,
    })
    .from(gameScores)
    .innerJoin(users, eq(gameScores.userId, users.id))
    .where(eq(gameScores.leaderboardPeriod, targetPeriod))
    .groupBy(users.id, users.walletAddress)
    .orderBy(
      asc(sql`MIN(${gameScores.moves})`),
      asc(sql`MIN(${gameScores.timeSeconds})`)
    )
    .limit(limit);

  // Add ranks
  const entries: LeaderboardEntry[] = leaderboardData.map((entry, index) => ({
    rank: index + 1,
    walletAddress: entry.walletAddress,
    bestMoves: entry.bestMoves,
    bestTime: entry.bestTime,
    gamesPlayed: entry.gamesPlayed,
  }));

  // Get total player count
  const [countResult] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${gameScores.userId})::integer`,
    })
    .from(gameScores)
    .where(eq(gameScores.leaderboardPeriod, targetPeriod));

  const result: LeaderboardResult = {
    entries,
    period: targetPeriod,
    totalPlayers: countResult?.count || 0,
  };

  // Cache result
  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_DURATION });

  return result;
}

/**
 * Get user's rank on leaderboard
 */
export async function getUserRank(
  userId: string,
  period?: string
): Promise<{ rank: number | null; entry: LeaderboardEntry | null }> {
  const targetPeriod = period || getCurrentPeriod();

  // Get user's best score
  const [userBest] = await db
    .select({
      walletAddress: users.walletAddress,
      bestMoves: sql<number>`MIN(${gameScores.moves})`,
      bestTime: sql<number>`MIN(${gameScores.timeSeconds})`,
      gamesPlayed: sql<number>`COUNT(*)::integer`,
    })
    .from(gameScores)
    .innerJoin(users, eq(gameScores.userId, users.id))
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.leaderboardPeriod, targetPeriod)
      )
    )
    .groupBy(users.id, users.walletAddress);

  if (!userBest || userBest.gamesPlayed === 0) {
    return { rank: null, entry: null };
  }

  // Count players with better scores (fewer moves, or same moves but faster time)
  const [rankResult] = await db
    .select({
      betterPlayers: sql<number>`COUNT(*)::integer`,
    })
    .from(
      db
        .select({
          minMoves: sql<number>`MIN(${gameScores.moves})`,
          minTime: sql<number>`MIN(${gameScores.timeSeconds})`,
        })
        .from(gameScores)
        .where(eq(gameScores.leaderboardPeriod, targetPeriod))
        .groupBy(gameScores.userId)
        .as('user_bests')
    )
    .where(
      sql`(min_moves < ${userBest.bestMoves}) OR (min_moves = ${userBest.bestMoves} AND min_time < ${userBest.bestTime})`
    );

  const rank = (rankResult?.betterPlayers || 0) + 1;

  return {
    rank,
    entry: {
      rank,
      walletAddress: userBest.walletAddress,
      bestMoves: userBest.bestMoves,
      bestTime: userBest.bestTime,
      gamesPlayed: userBest.gamesPlayed,
    },
  };
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats(period?: string): Promise<{
  totalPlayers: number;
  totalGames: number;
  averageMoves: number;
  averageTime: number;
}> {
  const targetPeriod = period || getCurrentPeriod();

  const [stats] = await db
    .select({
      totalPlayers: sql<number>`COUNT(DISTINCT ${gameScores.userId})::integer`,
      totalGames: sql<number>`COUNT(*)::integer`,
      averageMoves: sql<number>`ROUND(AVG(${gameScores.moves}))::integer`,
      averageTime: sql<number>`ROUND(AVG(${gameScores.timeSeconds}))::integer`,
    })
    .from(gameScores)
    .where(eq(gameScores.leaderboardPeriod, targetPeriod));

  return {
    totalPlayers: stats?.totalPlayers || 0,
    totalGames: stats?.totalGames || 0,
    averageMoves: stats?.averageMoves || 0,
    averageTime: stats?.averageTime || 0,
  };
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
