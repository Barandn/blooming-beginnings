/**
 * Score Service
 * Simple game score submission and validation
 */

import { db, gameScores, type GameScore, type NewGameScore } from '../db';
import { eq, and, desc, sql, asc } from 'drizzle-orm';

// Types
export interface ScoreSubmission {
  userId: string;
  gameType: 'card_match';
  moves: number;
  timeSeconds: number;
  matchedPairs: number;
  sessionId?: string;
}

export interface ScoreResult {
  success: boolean;
  score?: GameScore;
  error?: string;
}

// Constants
const MIN_MOVES = 12; // Minimum possible moves for 5x5 grid (12 pairs)
const MAX_MOVES = 500; // Maximum reasonable moves
const MIN_TIME = 10; // Minimum seconds (anti-cheat)
const MAX_TIME = 3600; // Maximum 1 hour
const TOTAL_PAIRS = 12; // 5x5 grid = 24 cards = 12 pairs (1 card unused)

/**
 * Get current leaderboard period (YYYY-MM format)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Validate and save a game score
 */
export async function saveScore(submission: ScoreSubmission): Promise<ScoreResult> {
  // Basic validation
  if (submission.moves < MIN_MOVES || submission.moves > MAX_MOVES) {
    return { success: false, error: 'Invalid move count' };
  }

  if (submission.timeSeconds < MIN_TIME || submission.timeSeconds > MAX_TIME) {
    return { success: false, error: 'Invalid game time' };
  }

  if (submission.matchedPairs < 0 || submission.matchedPairs > TOTAL_PAIRS) {
    return { success: false, error: 'Invalid matched pairs count' };
  }

  // Check for duplicate session
  if (submission.sessionId) {
    const [existing] = await db
      .select({ id: gameScores.id })
      .from(gameScores)
      .where(
        and(
          eq(gameScores.userId, submission.userId),
          eq(gameScores.sessionId, submission.sessionId)
        )
      )
      .limit(1);

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
        moves: submission.moves,
        timeSeconds: submission.timeSeconds,
        matchedPairs: submission.matchedPairs,
        sessionId: submission.sessionId,
        leaderboardPeriod: getCurrentPeriod(),
      } as NewGameScore)
      .returning();

    return { success: true, score: savedScore };
  } catch (error) {
    console.error('Failed to save score:', error);
    return { success: false, error: 'Failed to save score' };
  }
}

/**
 * Get user's best score (fewest moves, then fastest time)
 */
export async function getUserBestScore(userId: string): Promise<GameScore | null> {
  const [best] = await db
    .select()
    .from(gameScores)
    .where(eq(gameScores.userId, userId))
    .orderBy(asc(gameScores.moves), asc(gameScores.timeSeconds))
    .limit(1);

  return best || null;
}

/**
 * Get user's game statistics
 */
export async function getUserStats(userId: string): Promise<{
  totalGames: number;
  bestMoves: number | null;
  bestTime: number | null;
  averageMoves: number;
  averageTime: number;
}> {
  const [stats] = await db
    .select({
      totalGames: sql<number>`COUNT(*)::integer`,
      bestMoves: sql<number>`MIN(${gameScores.moves})`,
      bestTime: sql<number>`MIN(${gameScores.timeSeconds})`,
      averageMoves: sql<number>`ROUND(AVG(${gameScores.moves}))::integer`,
      averageTime: sql<number>`ROUND(AVG(${gameScores.timeSeconds}))::integer`,
    })
    .from(gameScores)
    .where(eq(gameScores.userId, userId));

  return {
    totalGames: stats?.totalGames || 0,
    bestMoves: stats?.bestMoves || null,
    bestTime: stats?.bestTime || null,
    averageMoves: stats?.averageMoves || 0,
    averageTime: stats?.averageTime || 0,
  };
}

/**
 * Get user's recent games
 */
export async function getUserRecentGames(
  userId: string,
  limit: number = 10
): Promise<GameScore[]> {
  return await db
    .select()
    .from(gameScores)
    .where(eq(gameScores.userId, userId))
    .orderBy(desc(gameScores.createdAt))
    .limit(limit);
}
