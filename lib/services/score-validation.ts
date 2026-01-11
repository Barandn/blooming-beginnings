/**
 * Score Validation Service
 * Anti-cheat validation for game scores
 * Includes time-delta checks and score bounds validation
 */

import { db, gameScores, type GameScore, type NewGameScore } from '../db';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { GAME_VALIDATION, SECURITY_CONFIG, ERROR_MESSAGES } from '../config/constants';

// Types
export interface ScoreSubmission {
  userId: string;
  gameType: 'card_match';
  score: number;
  monthlyProfit: number;
  sessionId?: string;
  gameStartedAt: number; // timestamp
  gameEndedAt: number; // timestamp
  validationData?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  score?: GameScore;
  error?: string;
  errorCode?: string;
  flags?: string[]; // Warning flags for suspicious activity
}

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
 * Validate time delta for game session
 * Checks if the game duration is within acceptable bounds
 *
 * @param startTime - Game start timestamp
 * @param endTime - Game end timestamp
 * @returns Validation result
 */
export function validateTimeDelta(
  startTime: number,
  endTime: number
): { valid: boolean; error?: string } {
  const duration = (endTime - startTime) / 1000; // in seconds

  // Check minimum time (too fast = likely cheating)
  if (duration < SECURITY_CONFIG.minGameActionTime) {
    return {
      valid: false,
      error: 'Game completed too quickly - suspicious activity detected',
    };
  }

  // Check maximum time (session expired)
  if (duration > SECURITY_CONFIG.maxGameSessionTime) {
    return {
      valid: false,
      error: ERROR_MESSAGES.GAME_SESSION_EXPIRED,
    };
  }

  return { valid: true };
}

/**
 * Validate score bounds
 * Checks if score is within acceptable range
 *
 * @param score - Score value
 * @param gameType - Type of game
 * @returns Validation result
 */
export function validateScoreBounds(
  score: number,
  gameType: string
): { valid: boolean; error?: string; flags?: string[] } {
  const bounds = GAME_VALIDATION.scoreBounds;
  const flags: string[] = [];

  // Check negative score
  if (score < bounds.minScore) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_SCORE,
    };
  }

  // Check daily maximum
  if (score > bounds.maxDailyScore) {
    return {
      valid: false,
      error: 'Score exceeds daily maximum',
      flags: ['exceeded_daily_max'],
    };
  }

  // Game-specific validation
  if (gameType === 'card_match') {
    const cardMatchConfig = GAME_VALIDATION.cardMatch;

    // Max possible score is matches * reward
    const maxPossibleScore = cardMatchConfig.maxMatchesPerDay * cardMatchConfig.rewardPerMatch;
    if (score > maxPossibleScore) {
      flags.push('exceeded_card_match_max');
      return {
        valid: false,
        error: 'Card match game score exceeds maximum possible',
        flags,
      };
    }
  }

  return { valid: true, flags: flags.length > 0 ? flags : undefined };
}

/**
 * Validate monthly profit bounds
 *
 * @param profit - Monthly profit value
 * @returns Validation result
 */
export function validateMonthlyProfit(
  profit: number
): { valid: boolean; error?: string } {
  const bounds = GAME_VALIDATION.scoreBounds;

  if (profit < 0) {
    return {
      valid: false,
      error: 'Monthly profit cannot be negative',
    };
  }

  if (profit > bounds.maxMonthlyProfit) {
    return {
      valid: false,
      error: 'Monthly profit exceeds maximum allowed',
    };
  }

  return { valid: true };
}

/**
 * Check for duplicate submissions
 * Prevents score manipulation through repeated submissions
 *
 * @param userId - User ID
 * @param sessionId - Game session ID
 * @returns true if duplicate exists
 */
export async function checkDuplicateSubmission(
  userId: string,
  sessionId: string
): Promise<boolean> {
  if (!sessionId) return false;

  const [existing] = await db
    .select({ id: gameScores.id })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.sessionId, sessionId)
      )
    )
    .limit(1);

  return !!existing;
}

/**
 * Get user's scores for today
 * Used for daily limit validation
 *
 * @param userId - User ID
 * @param gameType - Type of game
 * @returns Today's scores
 */
export async function getTodayScores(
  userId: string,
  gameType: string
): Promise<GameScore[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scores = await db
    .select()
    .from(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.gameType, gameType),
        gte(gameScores.createdAt, today)
      )
    );

  return scores;
}

/**
 * Validate card match game specific rules
 *
 * @param submission - Score submission
 * @param todayScores - Previous scores today
 * @returns Validation result
 */
function validateCardMatchRules(
  submission: ScoreSubmission,
  todayScores: GameScore[]
): { valid: boolean; error?: string } {
  const config = GAME_VALIDATION.cardMatch;

  // Check daily attempts limit
  if (todayScores.length >= config.maxAttempts) {
    return {
      valid: false,
      error: 'Daily card match game limit reached',
    };
  }

  // Validate time between submissions
  if (todayScores.length > 0) {
    const lastSubmission = todayScores[todayScores.length - 1];
    const timeSinceLast = Date.now() - new Date(lastSubmission.createdAt).getTime();

    if (timeSinceLast < config.minTimeBetweenFlips) {
      return {
        valid: false,
        error: 'Too many submissions in a short time',
      };
    }
  }

  return { valid: true };
}

/**
 * Full score validation and submission
 *
 * @param submission - Score submission data
 * @returns Validation result with saved score
 */
export async function validateAndSaveScore(
  submission: ScoreSubmission
): Promise<ValidationResult> {
  const flags: string[] = [];

  // Step 1: Validate time delta
  const timeDeltaResult = validateTimeDelta(
    submission.gameStartedAt,
    submission.gameEndedAt
  );
  if (!timeDeltaResult.valid) {
    return {
      valid: false,
      error: timeDeltaResult.error,
      errorCode: 'invalid_time_delta',
    };
  }

  // Step 2: Validate score bounds
  const boundsResult = validateScoreBounds(submission.score, submission.gameType);
  if (!boundsResult.valid) {
    return {
      valid: false,
      error: boundsResult.error,
      errorCode: 'score_out_of_bounds',
      flags: boundsResult.flags,
    };
  }
  if (boundsResult.flags) {
    flags.push(...boundsResult.flags);
  }

  // Step 3: Validate monthly profit
  const profitResult = validateMonthlyProfit(submission.monthlyProfit);
  if (!profitResult.valid) {
    return {
      valid: false,
      error: profitResult.error,
      errorCode: 'profit_out_of_bounds',
    };
  }

  // Step 4: Check for duplicate submission
  if (submission.sessionId) {
    const isDuplicate = await checkDuplicateSubmission(
      submission.userId,
      submission.sessionId
    );
    if (isDuplicate) {
      return {
        valid: false,
        error: 'Score already submitted for this session',
        errorCode: 'duplicate_submission',
      };
    }
  }

  // Step 5: Get today's scores for game-specific validation
  const todayScores = await getTodayScores(submission.userId, submission.gameType);

  // Step 6: Game-specific validation
  if (submission.gameType === 'card_match') {
    const cardMatchResult = validateCardMatchRules(submission, todayScores);
    if (!cardMatchResult.valid) {
      return {
        valid: false,
        error: cardMatchResult.error,
        errorCode: 'card_match_limit',
      };
    }
  }

  // Step 7: Calculate time taken
  const timeTaken = Math.round((submission.gameEndedAt - submission.gameStartedAt) / 1000);

  // Step 8: Save validated score
  try {
    const period = getCurrentPeriod();

    const [savedScore] = await db
      .insert(gameScores)
      .values({
        userId: submission.userId,
        gameType: submission.gameType,
        score: submission.score,
        monthlyProfit: submission.monthlyProfit,
        sessionId: submission.sessionId,
        timeTaken,
        gameStartedAt: new Date(submission.gameStartedAt),
        validationData: submission.validationData
          ? JSON.stringify(submission.validationData)
          : null,
        isValidated: true,
        leaderboardPeriod: period,
      } as typeof gameScores.$inferInsert)
      .returning();

    return {
      valid: true,
      score: savedScore,
      flags: flags.length > 0 ? flags : undefined,
    };
  } catch (error) {
    console.error('Failed to save score:', error);
    return {
      valid: false,
      error: 'Failed to save score',
      errorCode: 'save_failed',
    };
  }
}

/**
 * Get user's total monthly profit
 *
 * @param userId - User ID
 * @param period - Leaderboard period (optional, defaults to current)
 * @returns Total monthly profit
 */
export async function getUserMonthlyProfit(
  userId: string,
  period?: string
): Promise<number> {
  const targetPeriod = period || getCurrentPeriod();

  const result = await db
    .select({
      totalProfit: sql<number>`COALESCE(SUM(${gameScores.monthlyProfit}), 0)`,
    })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.leaderboardPeriod, targetPeriod),
        eq(gameScores.isValidated, true)
      )
    );

  return result[0]?.totalProfit || 0;
}

/**
 * Get user's best score for a game type
 *
 * @param userId - User ID
 * @param gameType - Type of game
 * @returns Best score
 */
export async function getUserBestScore(
  userId: string,
  gameType: string
): Promise<number> {
  const result = await db
    .select({
      bestScore: sql<number>`COALESCE(MAX(${gameScores.score}), 0)`,
    })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.gameType, gameType),
        eq(gameScores.isValidated, true)
      )
    );

  return result[0]?.bestScore || 0;
}
