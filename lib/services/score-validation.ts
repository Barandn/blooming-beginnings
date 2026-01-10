/**
 * Score Service
 * Game score submission and validation
 * Uses Supabase for database operations
 */

import { supabase, type GameScore, getCurrentPeriod } from '../db/index.js';

// Types
export interface ScoreSubmission {
  userId: string;
  gameType: 'card_match';
  score: number;
  monthlyProfit: number;
  sessionId?: string;
  timeTaken?: number;
  gameStartedAt?: number;
  validationData?: Record<string, unknown>;
}

export interface ScoreResult {
  success: boolean;
  score?: GameScore;
  error?: string;
}

// Constants
const MIN_SCORE = 0;
const MAX_SCORE = 10000;
const MIN_TIME = 10; // Minimum seconds (anti-cheat)
const MAX_TIME = 3600; // Maximum 1 hour

/**
 * Validate and save a game score
 */
export async function saveScore(submission: ScoreSubmission): Promise<ScoreResult> {
  // Basic validation
  if (submission.score < MIN_SCORE || submission.score > MAX_SCORE) {
    return { success: false, error: 'Invalid score' };
  }

  if (submission.timeTaken !== undefined) {
    if (submission.timeTaken < MIN_TIME || submission.timeTaken > MAX_TIME) {
      return { success: false, error: 'Invalid game time' };
    }
  }

  // Check for duplicate session
  if (submission.sessionId) {
    const { data: existing } = await supabase
      .from('game_scores')
      .select('id')
      .eq('user_id', submission.userId)
      .eq('session_id', submission.sessionId)
      .limit(1)
      .single();

    if (existing) {
      return { success: false, error: 'Score already submitted for this session' };
    }
  }

  // Save score
  try {
    const { data: savedScore, error } = await supabase
      .from('game_scores')
      .insert({
        user_id: submission.userId,
        game_type: submission.gameType,
        score: submission.score,
        monthly_profit: submission.monthlyProfit,
        session_id: submission.sessionId,
        time_taken: submission.timeTaken,
        game_started_at: submission.gameStartedAt
          ? new Date(submission.gameStartedAt).toISOString()
          : null,
        validation_data: submission.validationData
          ? JSON.stringify(submission.validationData)
          : null,
        leaderboard_period: getCurrentPeriod(),
        is_validated: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save score:', error);
      return { success: false, error: 'Failed to save score' };
    }

    return { success: true, score: savedScore as GameScore };
  } catch (error) {
    console.error('Failed to save score:', error);
    return { success: false, error: 'Failed to save score' };
  }
}

/**
 * Get user's best score (highest score)
 */
export async function getUserBestScore(userId: string): Promise<GameScore | null> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as GameScore;
}

/**
 * Get user's game statistics
 */
export async function getUserStats(userId: string): Promise<{
  totalGames: number;
  totalScore: number;
  bestScore: number | null;
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
      bestScore: null,
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
export async function getUserRecentGames(
  userId: string,
  limit: number = 10
): Promise<GameScore[]> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as GameScore[];
}

/**
 * Get user's current month statistics
 */
export async function getUserCurrentMonthStats(userId: string): Promise<{
  gamesPlayed: number;
  totalScore: number;
  monthlyProfit: number;
  rank: number | null;
}> {
  const currentPeriod = getCurrentPeriod();

  const { data, error } = await supabase
    .from('game_scores')
    .select('score, monthly_profit')
    .eq('user_id', userId)
    .eq('leaderboard_period', currentPeriod);

  if (error || !data || data.length === 0) {
    return {
      gamesPlayed: 0,
      totalScore: 0,
      monthlyProfit: 0,
      rank: null,
    };
  }

  const gamesPlayed = data.length;
  const totalScore = data.reduce((sum, d) => sum + (d.score || 0), 0);
  const monthlyProfit = data.reduce((sum, d) => sum + (d.monthly_profit || 0), 0);

  return {
    gamesPlayed,
    totalScore,
    monthlyProfit,
    rank: null, // Rank calculation done in leaderboard service
  };
}

// Re-export getCurrentPeriod for convenience
export { getCurrentPeriod };
