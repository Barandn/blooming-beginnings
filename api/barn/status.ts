/**
 * GET /api/barn/status
 * Get user's barn game status including Play Pass and cooldown
 *
 * Play Pass System:
 * - 1 WLD = 1 hour unlimited play
 * - Or wait 12 hours cooldown for 1 free game
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, barnGameAttempts } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import {
  API_STATUS,
  BARN_GAME_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Get barn game record
    const [record] = await db
      .select()
      .from(barnGameAttempts)
      .where(eq(barnGameAttempts.userId, auth.user.id))
      .limit(1);

    const now = Date.now();

    // If no record exists, user can play (first free game)
    if (!record) {
      return res.status(200).json({
        status: API_STATUS.SUCCESS,
        data: {
          hasActivePass: false,
          playPassExpiresAt: null,
          playPassRemainingMs: 0,
          isInCooldown: false,
          cooldownEndsAt: null,
          cooldownRemainingMs: 0,
          freeGameAvailable: true,
          canPlay: true,
          totalCoinsWonToday: 0,
          matchesFoundToday: 0,
          purchasePrice: {
            WLD: BARN_GAME_CONFIG.purchasePriceWLD,
          },
          playPassDurationMs: BARN_GAME_CONFIG.playPassDuration,
        },
      });
    }

    // Check if Play Pass is active
    let hasActivePass = false;
    let playPassRemainingMs = 0;
    let playPassExpiresAtMs: number | null = null;

    if (record.playPassExpiresAt) {
      const passExpireTime = new Date(record.playPassExpiresAt).getTime();
      if (now < passExpireTime) {
        hasActivePass = true;
        playPassRemainingMs = passExpireTime - now;
        playPassExpiresAtMs = passExpireTime;
      }
    }

    // Check if cooldown is active
    let isInCooldown = false;
    let cooldownRemainingMs = 0;
    let cooldownEndsAtMs: number | null = null;
    let freeGameAvailable = false;

    if (!hasActivePass) {
      if (record.cooldownEndsAt) {
        const cooldownEndTime = new Date(record.cooldownEndsAt).getTime();
        if (now < cooldownEndTime) {
          // Cooldown is still active
          isInCooldown = true;
          cooldownRemainingMs = cooldownEndTime - now;
          cooldownEndsAtMs = cooldownEndTime;
        } else {
          // Cooldown expired - reset for free game
          freeGameAvailable = !record.freeGameUsed;

          // If cooldown expired and free game was used, reset the cycle
          if (record.freeGameUsed) {
            await db
              .update(barnGameAttempts)
              .set({
                freeGameUsed: false,
                cooldownEndsAt: null,
                totalCoinsWonToday: 0,
                matchesFoundToday: 0,
                updatedAt: new Date(),
              } as Partial<typeof barnGameAttempts.$inferInsert>)
              .where(eq(barnGameAttempts.userId, auth.user.id));

            freeGameAvailable = true;
          }
        }
      } else {
        // No cooldown set - free game is available if not used
        freeGameAvailable = !record.freeGameUsed;
      }
    }

    // Determine if user can play
    const canPlay = hasActivePass || freeGameAvailable;

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        hasActivePass,
        playPassExpiresAt: playPassExpiresAtMs,
        playPassRemainingMs,
        isInCooldown,
        cooldownEndsAt: cooldownEndsAtMs,
        cooldownRemainingMs,
        freeGameAvailable,
        canPlay,
        totalCoinsWonToday: record.totalCoinsWonToday,
        matchesFoundToday: record.matchesFoundToday,
        purchasePrice: {
          WLD: BARN_GAME_CONFIG.purchasePriceWLD,
        },
        playPassDurationMs: BARN_GAME_CONFIG.playPassDuration,
      },
    });
  } catch (error) {
    console.error('Barn game status error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
