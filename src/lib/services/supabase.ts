/**
 * Frontend Supabase Services
 * Direct database access for Lovable compatibility
 *
 * These services can be used instead of API calls for simpler operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// Type aliases for convenience
export type User = Tables<'users'>;
export type GameScore = Tables<'game_scores'>;
export type BarnGameAttempt = Tables<'barn_game_attempts'>;

/**
 * Get current leaderboard period (YYYY-MM format)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ============================================
// User Services
// ============================================

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================
// Game Score Services
// ============================================

/**
 * Submit a game score
 */
export async function submitGameScore(data: {
  userId: string;
  gameType: string;
  score: number;
  monthlyProfit: number;
  sessionId?: string;
  timeTaken?: number;
  gameStartedAt?: string;
  validationData?: Record<string, unknown>;
}): Promise<GameScore | null> {
  const { data: score, error } = await supabase
    .from('game_scores')
    .insert({
      user_id: data.userId,
      game_type: data.gameType,
      score: data.score,
      monthly_profit: data.monthlyProfit,
      session_id: data.sessionId,
      time_taken: data.timeTaken,
      game_started_at: data.gameStartedAt,
      validation_data: data.validationData ? JSON.stringify(data.validationData) : null,
      leaderboard_period: getCurrentPeriod(),
      is_validated: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to submit score:', error);
    return null;
  }

  return score;
}

/**
 * Get user's game statistics
 */
export async function getUserGameStats(userId: string): Promise<{
  totalGames: number;
  totalScore: number;
  bestScore: number;
  monthlyProfit: number;
  averageScore: number;
}> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('score, monthly_profit')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) {
    return {
      totalGames: 0,
      totalScore: 0,
      bestScore: 0,
      monthlyProfit: 0,
      averageScore: 0,
    };
  }

  const totalGames = data.length;
  const totalScore = data.reduce((sum, d) => sum + (d.score || 0), 0);
  const bestScore = Math.max(...data.map(d => d.score || 0));
  const monthlyProfit = data.reduce((sum, d) => sum + (d.monthly_profit || 0), 0);

  return {
    totalGames,
    totalScore,
    bestScore,
    monthlyProfit,
    averageScore: totalGames > 0 ? Math.round(totalScore / totalGames) : 0,
  };
}

/**
 * Get user's recent games
 */
export async function getUserRecentGames(userId: string, limit: number = 10): Promise<GameScore[]> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}

// ============================================
// Leaderboard Services
// ============================================

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  monthlyProfit: number;
  totalScore: number;
  gamesPlayed: number;
}

/**
 * Get leaderboard for a specific period
 */
export async function getLeaderboard(
  period?: string,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const targetPeriod = period || getCurrentPeriod();

  const { data, error } = await supabase
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

  if (error || !data) {
    console.error('Leaderboard query error:', error);
    return [];
  }

  // Aggregate scores by user
  const userScores = new Map<string, {
    walletAddress: string;
    totalScore: number;
    monthlyProfit: number;
    gamesPlayed: number;
  }>();

  for (const score of data) {
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
  return sortedScores.map((entry, index) => ({
    rank: index + 1,
    walletAddress: entry.walletAddress,
    monthlyProfit: entry.monthlyProfit,
    totalScore: entry.totalScore,
    gamesPlayed: entry.gamesPlayed,
  }));
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

// ============================================
// Barn Game Services
// ============================================

/**
 * Get barn game status for a user
 */
export async function getBarnGameStatus(userId: string): Promise<BarnGameAttempt | null> {
  const { data, error } = await supabase
    .from('barn_game_attempts')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Create or update barn game status
 */
export async function upsertBarnGameStatus(
  userId: string,
  updates: Partial<TablesInsert<'barn_game_attempts'>>
): Promise<BarnGameAttempt | null> {
  const { data, error } = await supabase
    .from('barn_game_attempts')
    .upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to update barn game status:', error);
    return null;
  }

  return data;
}

// ============================================
// Daily Bonus Services
// ============================================

/**
 * Check if user can claim daily bonus
 */
export async function canClaimDailyBonus(userId: string): Promise<{
  canClaim: boolean;
  lastClaimDate: string | null;
  streakCount: number;
}> {
  const { data: user, error } = await supabase
    .from('users')
    .select('last_daily_claim_date, daily_streak_count')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return { canClaim: true, lastClaimDate: null, streakCount: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const canClaim = user.last_daily_claim_date !== today;

  return {
    canClaim,
    lastClaimDate: user.last_daily_claim_date,
    streakCount: user.daily_streak_count || 0,
  };
}

/**
 * Update daily bonus claim status
 */
export async function updateDailyBonusClaim(userId: string): Promise<{
  success: boolean;
  streakCount: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get current user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('last_daily_claim_date, daily_streak_count')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return { success: false, streakCount: 0 };
  }

  // Calculate new streak
  let newStreak = 1;
  if (user.last_daily_claim_date === yesterday) {
    newStreak = (user.daily_streak_count || 0) + 1;
  }

  // Update user
  const { error: updateError } = await supabase
    .from('users')
    .update({
      last_daily_claim_date: today,
      daily_streak_count: newStreak,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Failed to update daily bonus:', updateError);
    return { success: false, streakCount: 0 };
  }

  return { success: true, streakCount: newStreak };
}

// Export supabase client for direct access if needed
export { supabase };
