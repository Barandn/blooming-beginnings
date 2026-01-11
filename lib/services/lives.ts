/**
 * Lives (Can) System Service
 *
 * Lives System Rules:
 * - Default: 5 lives
 * - Maximum: 5 lives
 * - Regeneration: 1 life every 6 hours
 * - Consumption: 1 life per game played
 *
 * This service handles all lives-related operations:
 * - Getting current lives count with auto-regeneration
 * - Consuming a life when starting a game
 * - Getting next life regeneration time
 */

import { db, barnGameAttempts, type BarnGameAttempt } from '../db/index.js';
import { eq } from 'drizzle-orm';

// ============================================
// CONSTANTS
// ============================================
export const LIVES_CONFIG = {
  MAX_LIVES: 5,
  DEFAULT_LIVES: 5,
  REGENERATION_HOURS: 6,
  REGENERATION_MS: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
} as const;

// ============================================
// TYPES
// ============================================
export interface LivesStatus {
  lives: number;
  maxLives: number;
  nextLifeAt: number | null; // Timestamp when next life will be available
  nextLifeInMs: number; // Milliseconds until next life
  canPlay: boolean;
}

export interface ConsumeLifeResult {
  success: boolean;
  livesRemaining: number;
  nextLifeAt: number | null;
  error?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate how many lives should be regenerated based on time passed
 */
function calculateRegeneratedLives(
  currentLives: number,
  lastRegeneratedAt: Date | null
): { newLives: number; newRegeneratedAt: Date } {
  const now = new Date();

  if (!lastRegeneratedAt) {
    // First time - start with default lives
    return {
      newLives: LIVES_CONFIG.DEFAULT_LIVES,
      newRegeneratedAt: now,
    };
  }

  // If already at max, no regeneration needed
  if (currentLives >= LIVES_CONFIG.MAX_LIVES) {
    return {
      newLives: LIVES_CONFIG.MAX_LIVES,
      newRegeneratedAt: lastRegeneratedAt,
    };
  }

  // Calculate time passed in hours
  const msPassed = now.getTime() - lastRegeneratedAt.getTime();
  const hoursPassed = Math.floor(msPassed / (60 * 60 * 1000));
  const regenerationPeriods = Math.floor(hoursPassed / LIVES_CONFIG.REGENERATION_HOURS);

  if (regenerationPeriods <= 0) {
    return {
      newLives: currentLives,
      newRegeneratedAt: lastRegeneratedAt,
    };
  }

  // Calculate new lives (capped at max)
  const livesToAdd = regenerationPeriods;
  const newLives = Math.min(currentLives + livesToAdd, LIVES_CONFIG.MAX_LIVES);

  // Calculate new regeneration timestamp
  // Move forward by the number of full regeneration periods used
  const periodsUsed = newLives - currentLives;
  const msToAdd = periodsUsed * LIVES_CONFIG.REGENERATION_MS;
  const newRegeneratedAt = new Date(lastRegeneratedAt.getTime() + msToAdd);

  return {
    newLives,
    newRegeneratedAt,
  };
}

/**
 * Calculate when the next life will be available
 */
function calculateNextLifeTime(
  currentLives: number,
  lastRegeneratedAt: Date | null
): { nextLifeAt: number | null; nextLifeInMs: number } {
  // If at max lives, no next life needed
  if (currentLives >= LIVES_CONFIG.MAX_LIVES) {
    return { nextLifeAt: null, nextLifeInMs: 0 };
  }

  // If no regeneration timestamp, start from now
  const baseTime = lastRegeneratedAt || new Date();
  const nextLifeAt = baseTime.getTime() + LIVES_CONFIG.REGENERATION_MS;
  const nextLifeInMs = Math.max(0, nextLifeAt - Date.now());

  return { nextLifeAt, nextLifeInMs };
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Get or create barn game attempts record for a user
 */
async function getOrCreateBarnGameAttempts(userId: string): Promise<BarnGameAttempt> {
  // Try to find existing record
  const existing = await db.query.barnGameAttempts.findFirst({
    where: eq(barnGameAttempts.userId, userId),
  });

  if (existing) {
    return existing;
  }

  // Create new record with default lives
  const [newRecord] = await db
    .insert(barnGameAttempts)
    .values({
      userId,
      lives: LIVES_CONFIG.DEFAULT_LIVES,
      livesLastRegeneratedAt: new Date().toISOString(),
    })
    .returning();

  return newRecord;
}

/**
 * Get current lives status for a user with auto-regeneration
 * This is the main function to call when checking lives
 */
export async function getLivesStatus(userId: string): Promise<LivesStatus> {
  const record = await getOrCreateBarnGameAttempts(userId);

  // Calculate regenerated lives
  const { newLives, newRegeneratedAt } = calculateRegeneratedLives(
    record.lives,
    record.livesLastRegeneratedAt
  );

  // Update database if lives regenerated
  if (newLives !== record.lives) {
    await db
      .update(barnGameAttempts)
      .set({
        lives: newLives,
        livesLastRegeneratedAt: newRegeneratedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(barnGameAttempts.userId, userId));
  }

  // Calculate next life time
  const { nextLifeAt, nextLifeInMs } = calculateNextLifeTime(newLives, newRegeneratedAt);

  return {
    lives: newLives,
    maxLives: LIVES_CONFIG.MAX_LIVES,
    nextLifeAt,
    nextLifeInMs,
    canPlay: newLives > 0,
  };
}

/**
 * Consume one life when starting a game
 * Returns success/failure and remaining lives
 */
export async function consumeLife(userId: string): Promise<ConsumeLifeResult> {
  // First get current status (with regeneration)
  const status = await getLivesStatus(userId);

  // Check if user has lives to consume
  if (status.lives <= 0) {
    return {
      success: false,
      livesRemaining: 0,
      nextLifeAt: status.nextLifeAt,
      error: 'No lives remaining. Lives regenerate every 6 hours.',
    };
  }

  // Consume one life
  const newLives = status.lives - 1;

  // Update database
  await db
    .update(barnGameAttempts)
    .set({
      lives: newLives,
      hasActiveGame: true,
      lastPlayedDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(barnGameAttempts.userId, userId));

  // Calculate next life time for the new lives count
  const record = await db.query.barnGameAttempts.findFirst({
    where: eq(barnGameAttempts.userId, userId),
  });

  const { nextLifeAt } = calculateNextLifeTime(
    newLives,
    record?.livesLastRegeneratedAt || null
  );

  return {
    success: true,
    livesRemaining: newLives,
    nextLifeAt,
  };
}

/**
 * Add lives to a user (for purchases or rewards)
 */
export async function addLives(userId: string, amount: number): Promise<LivesStatus> {
  const record = await getOrCreateBarnGameAttempts(userId);

  // Calculate new lives (capped at max)
  const newLives = Math.min(record.lives + amount, LIVES_CONFIG.MAX_LIVES);

  // Update database
  await db
    .update(barnGameAttempts)
    .set({
      lives: newLives,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(barnGameAttempts.userId, userId));

  // Return updated status
  return getLivesStatus(userId);
}

/**
 * Reset lives to max (for testing or admin purposes)
 */
export async function resetLives(userId: string): Promise<LivesStatus> {
  await db
    .update(barnGameAttempts)
    .set({
      lives: LIVES_CONFIG.MAX_LIVES,
      livesLastRegeneratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(barnGameAttempts.userId, userId));

  return getLivesStatus(userId);
}

/**
 * End active game session
 */
export async function endGame(userId: string): Promise<void> {
  await db
    .update(barnGameAttempts)
    .set({
      hasActiveGame: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(barnGameAttempts.userId, userId));
}

/**
 * Get full barn game status including play pass and cooldown info
 */
export async function getFullBarnGameStatus(userId: string): Promise<{
  lives: LivesStatus;
  hasActivePass: boolean;
  playPassExpiresAt: number | null;
  playPassRemainingMs: number;
  isInCooldown: boolean;
  cooldownEndsAt: number | null;
  cooldownRemainingMs: number;
  freeGameAvailable: boolean;
}> {
  const record = await getOrCreateBarnGameAttempts(userId);
  const lives = await getLivesStatus(userId);

  const now = Date.now();

  // Check play pass
  const hasActivePass = record.playPassExpiresAt
    ? new Date(record.playPassExpiresAt).getTime() > now
    : false;
  const playPassExpiresAt = record.playPassExpiresAt
    ? new Date(record.playPassExpiresAt).getTime()
    : null;
  const playPassRemainingMs = playPassExpiresAt
    ? Math.max(0, playPassExpiresAt - now)
    : 0;

  // Check cooldown
  const cooldownEndsAt = record.cooldownEndsAt
    ? new Date(record.cooldownEndsAt).getTime()
    : null;
  const isInCooldown = cooldownEndsAt ? cooldownEndsAt > now : false;
  const cooldownRemainingMs = cooldownEndsAt
    ? Math.max(0, cooldownEndsAt - now)
    : 0;

  return {
    lives,
    hasActivePass,
    playPassExpiresAt,
    playPassRemainingMs,
    isInCooldown: isInCooldown && !hasActivePass,
    cooldownEndsAt: isInCooldown && !hasActivePass ? cooldownEndsAt : null,
    cooldownRemainingMs: isInCooldown && !hasActivePass ? cooldownRemainingMs : 0,
    freeGameAvailable: !record.freeGameUsed,
  };
}
