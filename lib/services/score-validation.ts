/**
 * Score Service
 * Game score submission and validation
 * Uses Drizzle ORM for database operations
 */

import { eq, and, desc } from 'drizzle-orm';
import { db, gameScores, type GameScore, getCurrentPeriod } from '../db/index.js';

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
    const existing = await db.query.gameScores.findFirst({
      where: and(
        eq(gameScores.userId, submission.userId),
        eq(gameScores.sessionId, submission.sessionId)
      ),
    });

    if (existing) {
      return { success: false, error: 'Score already submitted for this session' };
    }
  }

  // Save score
  try {
    const [savedScore] = await db
      .insert(gameScores)
      .values({
        userId: submission.userId,
        gameType: submission.gameType,
        score: submission.score,
        monthlyProfit: submission.monthlyProfit,
        sessionId: submission.sessionId,
        timeTaken: submission.timeTaken,
        gameStartedAt: submission.gameStartedAt
          ? new Date(submission.gameStartedAt)
          : null,
        validationData: submission.validationData
          ? JSON.stringify(submission.validationData)
          : null,
        leaderboardPeriod: getCurrentPeriod(),
        isValidated: true,
      })
      .returning();

    return { success: true, score: savedScore };
  } catch (error) {
    console.error('Failed to save score:', error);
    return { success: false, error: 'Failed to save score' };
  }
}

/**
 * Get user's best score (highest score)
 */
export async function getUserBestScore(userId: string): Promise<GameScore | null> {
  const result = await db.query.gameScores.findFirst({
    where: eq(gameScores.userId, userId),
    orderBy: [desc(gameScores.score)],
  });

  return result || null;
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
  const data = await db
    .select({
      score: gameScores.score,
      monthlyProfit: gameScores.monthlyProfit,
    })
    .from(gameScores)
    .where(eq(gameScores.userId, userId));

  if (!data || data.length === 0) {
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
  const monthlyProfit = data.reduce((sum, d) => sum + (d.monthlyProfit || 0), 0);

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
  const data = await db
    .select()
    .from(gameScores)
    .where(eq(gameScores.userId, userId))
    .orderBy(desc(gameScores.createdAt))
    .limit(limit);

  return data;
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

  const data = await db
    .select({
      score: gameScores.score,
      monthlyProfit: gameScores.monthlyProfit,
    })
    .from(gameScores)
    .where(and(
      eq(gameScores.userId, userId),
      eq(gameScores.leaderboardPeriod, currentPeriod)
    ));

  if (!data || data.length === 0) {
    return {
      gamesPlayed: 0,
      totalScore: 0,
      monthlyProfit: 0,
      rank: null,
    };
  }

  const gamesPlayed = data.length;
  const totalScore = data.reduce((sum, d) => sum + (d.score || 0), 0);
  const monthlyProfit = data.reduce((sum, d) => sum + (d.monthlyProfit || 0), 0);

  return {
    gamesPlayed,
    totalScore,
    monthlyProfit,
    rank: null, // Rank calculation done in leaderboard service
  };
}

// Re-export getCurrentPeriod for convenience
export { getCurrentPeriod };
