/**
 * Leaderboard Service
 * Rankings based on score (higher score = better)
 * Uses Supabase for database operations
 */

import { supabase, getCurrentPeriod } from '../db/index.js';

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

  // Query: Get aggregated scores per user for the period
  const { data: scoresData, error: scoresError } = await supabase
    .from('game_scores')
    .select(`
      user_id,
      score,
      monthly_profit,
      users!inner (
        wallet_address
      )
    `)
    .eq('leaderboard_period', targetPeriod);

  if (scoresError) {
    console.error('Leaderboard query error:', scoresError);
    return { entries: [], period: targetPeriod, totalPlayers: 0 };
  }

  // Aggregate scores by user
  const userScores = new Map<string, {
    walletAddress: string;
    totalScore: number;
    monthlyProfit: number;
    gamesPlayed: number;
  }>();

  for (const score of scoresData || []) {
    const userId = score.user_id;
    const walletAddress = (score.users as any)?.wallet_address || '';

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
    userScore.monthlyProfit += score.monthly_profit || 0;
    userScore.gamesPlayed += 1;
  }

  // Convert to array and sort by monthly profit (descending)
  const sortedScores = Array.from(userScores.values())
    .sort((a, b) => b.monthlyProfit - a.monthlyProfit)
    .slice(0, limit);

  // Add ranks
  const entries: LeaderboardEntry[] = sortedScores.map((entry, index) => ({
    rank: index + 1,
    walletAddress: entry.walletAddress,
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
}

/**
 * Get user's rank on leaderboard
 */
export async function getUserRank(
  userId: string,
  period?: string
): Promise<{ rank: number | null; entry: LeaderboardEntry | null }> {
  const targetPeriod = period || getCurrentPeriod();

  // Get user's scores for this period
  const { data: userScores, error: userError } = await supabase
    .from('game_scores')
    .select(`
      score,
      monthly_profit,
      users!inner (
        wallet_address
      )
    `)
    .eq('user_id', userId)
    .eq('leaderboard_period', targetPeriod);

  if (userError || !userScores || userScores.length === 0) {
    return { rank: null, entry: null };
  }

  // Calculate user's totals
  const walletAddress = (userScores[0].users as any)?.wallet_address || '';
  const totalScore = userScores.reduce((sum, s) => sum + (s.score || 0), 0);
  const monthlyProfit = userScores.reduce((sum, s) => sum + (s.monthly_profit || 0), 0);
  const gamesPlayed = userScores.length;

  // Get all users' monthly profits to calculate rank
  const { data: allScores, error: allError } = await supabase
    .from('game_scores')
    .select('user_id, monthly_profit')
    .eq('leaderboard_period', targetPeriod);

  if (allError) {
    return { rank: null, entry: null };
  }

  // Aggregate all users' monthly profits
  const allUserProfits = new Map<string, number>();
  for (const score of allScores || []) {
    const current = allUserProfits.get(score.user_id) || 0;
    allUserProfits.set(score.user_id, current + (score.monthly_profit || 0));
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
      walletAddress,
      monthlyProfit,
      totalScore,
      gamesPlayed,
    },
  };
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

  const { data, error } = await supabase
    .from('game_scores')
    .select('user_id, monthly_profit')
    .eq('leaderboard_period', targetPeriod);

  if (error || !data) {
    return {
      totalPlayers: 0,
      totalGames: 0,
      totalProfit: 0,
      averageProfit: 0,
    };
  }

  const uniqueUsers = new Set(data.map(d => d.user_id));
  const totalProfit = data.reduce((sum, d) => sum + (d.monthly_profit || 0), 0);

  return {
    totalPlayers: uniqueUsers.size,
    totalGames: data.length,
    totalProfit,
    averageProfit: uniqueUsers.size > 0 ? Math.round(totalProfit / uniqueUsers.size) : 0,
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

// Re-export getCurrentPeriod for convenience
export { getCurrentPeriod };
