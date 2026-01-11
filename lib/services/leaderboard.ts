/**
 * Leaderboard Service
 * High-performance leaderboard queries from Postgres
 */

import { db, gameScores, users } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { LEADERBOARD_CONFIG } from '../config/constants';
import { getCurrentPeriod } from './score-validation';

// Types
export interface LeaderboardEntry {
  rank: number;
  nullifierHash: string;
  walletAddress: string;
  monthlyProfit: number;
  totalScore: number;
  gamesPlayed: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  period: string;
  totalPlayers: number;
  userRank?: number;
  userEntry?: LeaderboardEntry;
}

// Simple in-memory cache
const cache = new Map<string, { data: LeaderboardResult; expiry: number }>();

/**
 * Get cache key for leaderboard
 */
function getCacheKey(period: string, limit: number, offset: number): string {
  return `leaderboard:${period}:${limit}:${offset}`;
}

/**
 * Get cached leaderboard or null if expired/missing
 */
function getCachedLeaderboard(key: string): LeaderboardResult | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Cache leaderboard result
 */
function cacheLeaderboard(key: string, data: LeaderboardResult): void {
  cache.set(key, {
    data,
    expiry: Date.now() + LEADERBOARD_CONFIG.cacheDuration * 1000,
  });
}

/**
 * Get top leaderboard entries for a period
 *
 * @param period - Leaderboard period (YYYY-MM)
 * @param limit - Number of entries to return
 * @param offset - Offset for pagination
 * @returns Leaderboard entries
 */
export async function getTopLeaderboard(
  period?: string,
  limit: number = LEADERBOARD_CONFIG.topEntriesCount,
  offset: number = 0
): Promise<LeaderboardResult> {
  const targetPeriod = period || getCurrentPeriod();
  const cacheKey = getCacheKey(targetPeriod, limit, offset);

  // Check cache
  const cached = getCachedLeaderboard(cacheKey);
  if (cached) {
    return cached;
  }

  // Query aggregated scores per user
  const leaderboardQuery = await db
    .select({
      nullifierHash: users.nullifierHash,
      walletAddress: users.walletAddress,
      monthlyProfit: sql<number>`COALESCE(SUM(${gameScores.monthlyProfit}), 0)::integer`,
      totalScore: sql<number>`COALESCE(SUM(${gameScores.score}), 0)::integer`,
      gamesPlayed: sql<number>`COUNT(${gameScores.id})::integer`,
    })
    .from(gameScores)
    .innerJoin(users, eq(gameScores.userId, users.id))
    .where(
      and(
        eq(gameScores.leaderboardPeriod, targetPeriod),
        eq(gameScores.isValidated, true)
      )
    )
    .groupBy(users.id, users.nullifierHash, users.walletAddress)
    .having(sql`SUM(${gameScores.monthlyProfit}) >= ${LEADERBOARD_CONFIG.minimumScore}`)
    .orderBy(desc(sql`SUM(${gameScores.monthlyProfit})`))
    .limit(limit)
    .offset(offset);

  // Add ranks
  const entries: LeaderboardEntry[] = leaderboardQuery.map((entry, index) => ({
    rank: offset + index + 1,
    nullifierHash: entry.nullifierHash,
    walletAddress: entry.walletAddress,
    monthlyProfit: entry.monthlyProfit,
    totalScore: entry.totalScore,
    gamesPlayed: entry.gamesPlayed,
  }));

  // Get total player count
  const [countResult] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${gameScores.userId})::integer`,
    })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.leaderboardPeriod, targetPeriod),
        eq(gameScores.isValidated, true)
      )
    );

  const result: LeaderboardResult = {
    entries,
    period: targetPeriod,
    totalPlayers: countResult?.count || 0,
  };

  // Cache result
  cacheLeaderboard(cacheKey, result);

  return result;
}

/**
 * Get user's rank on the leaderboard
 *
 * @param userId - User ID
 * @param period - Leaderboard period
 * @returns User's rank and entry
 */
export async function getUserRank(
  userId: string,
  period?: string
): Promise<{
  rank: number | null;
  entry: LeaderboardEntry | null;
}> {
  const targetPeriod = period || getCurrentPeriod();

  // Get user's aggregated score
  const [userScore] = await db
    .select({
      nullifierHash: users.nullifierHash,
      walletAddress: users.walletAddress,
      monthlyProfit: sql<number>`COALESCE(SUM(${gameScores.monthlyProfit}), 0)::integer`,
      totalScore: sql<number>`COALESCE(SUM(${gameScores.score}), 0)::integer`,
      gamesPlayed: sql<number>`COUNT(${gameScores.id})::integer`,
    })
    .from(gameScores)
    .innerJoin(users, eq(gameScores.userId, users.id))
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.leaderboardPeriod, targetPeriod),
        eq(gameScores.isValidated, true)
      )
    )
    .groupBy(users.id, users.nullifierHash, users.walletAddress);

  if (!userScore || userScore.monthlyProfit === 0) {
    return { rank: null, entry: null };
  }

  // Get rank by counting players with higher profit
  const [rankResult] = await db
    .select({
      rank: sql<number>`COUNT(*) + 1`,
    })
    .from(
      db
        .select({
          userId: gameScores.userId,
          profit: sql<number>`SUM(${gameScores.monthlyProfit})`,
        })
        .from(gameScores)
        .where(
          and(
            eq(gameScores.leaderboardPeriod, targetPeriod),
            eq(gameScores.isValidated, true)
          )
        )
        .groupBy(gameScores.userId)
        .having(sql`SUM(${gameScores.monthlyProfit}) > ${userScore.monthlyProfit}`)
        .as('higher_scores')
    );

  const rank = rankResult?.rank || 1;

  return {
    rank,
    entry: {
      rank,
      nullifierHash: userScore.nullifierHash,
      walletAddress: userScore.walletAddress,
      monthlyProfit: userScore.monthlyProfit,
      totalScore: userScore.totalScore,
      gamesPlayed: userScore.gamesPlayed,
    },
  };
}

/**
 * Get leaderboard with user context
 * Returns top entries plus user's rank
 *
 * @param userId - Current user ID (optional)
 * @param period - Leaderboard period
 * @param limit - Number of entries
 * @returns Leaderboard with user context
 */
export async function getLeaderboardWithUserContext(
  userId?: string,
  period?: string,
  limit: number = LEADERBOARD_CONFIG.topEntriesCount
): Promise<LeaderboardResult> {
  const targetPeriod = period || getCurrentPeriod();

  // Get top leaderboard
  const result = await getTopLeaderboard(targetPeriod, limit);

  // If user provided, get their rank
  if (userId) {
    const userRank = await getUserRank(userId, targetPeriod);
    result.userRank = userRank.rank || undefined;
    result.userEntry = userRank.entry || undefined;
  }

  return result;
}

/**
 * Get leaderboard entries around a user
 * Shows entries before and after the user's position
 *
 * @param userId - User ID
 * @param period - Leaderboard period
 * @param surrounding - Number of entries to show on each side
 * @returns Surrounding entries
 */
export async function getSurroundingEntries(
  userId: string,
  period?: string,
  surrounding: number = 5
): Promise<LeaderboardEntry[]> {
  const targetPeriod = period || getCurrentPeriod();

  // Get user's rank first
  const { rank } = await getUserRank(userId, targetPeriod);

  if (!rank) {
    return [];
  }

  // Calculate offset
  const offset = Math.max(0, rank - surrounding - 1);
  const limit = surrounding * 2 + 1;

  // Get surrounding entries
  const result = await getTopLeaderboard(targetPeriod, limit, offset);

  return result.entries;
}

/**
 * Get historical leaderboards (previous months)
 *
 * @param months - Number of months to include
 * @returns Array of period strings
 */
export function getPreviousPeriods(months: number = 3): string[] {
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
 * Call this when scores are updated
 */
export function clearLeaderboardCache(): void {
  cache.clear();
}

/**
 * Get leaderboard statistics
 *
 * @param period - Leaderboard period
 * @returns Statistics
 */
export async function getLeaderboardStats(period?: string): Promise<{
  totalPlayers: number;
  totalGames: number;
  totalProfit: number;
  averageProfit: number;
}> {
  const targetPeriod = period || getCurrentPeriod();

  const [stats] = await db
    .select({
      totalPlayers: sql<number>`COUNT(DISTINCT ${gameScores.userId})::integer`,
      totalGames: sql<number>`COUNT(${gameScores.id})::integer`,
      totalProfit: sql<number>`COALESCE(SUM(${gameScores.monthlyProfit}), 0)::integer`,
      averageProfit: sql<number>`COALESCE(AVG(${gameScores.monthlyProfit}), 0)::integer`,
    })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.leaderboardPeriod, targetPeriod),
        eq(gameScores.isValidated, true)
      )
    );

  return {
    totalPlayers: stats?.totalPlayers || 0,
    totalGames: stats?.totalGames || 0,
    totalProfit: stats?.totalProfit || 0,
    averageProfit: stats?.averageProfit || 0,
  };
}
