/**
 * POST /api/barn/use-free-game
 * Mark free game as used and start cooldown
 *
 * This endpoint should be called when a user starts a game without Play Pass.
 * It will:
 * - Mark the free game as used
 * - Start the 12-hour cooldown
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, barnGameAttempts } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { rateLimitCheck } from '../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  BARN_GAME_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  // Check rate limit
  const rateLimited = rateLimitCheck(req, res);
  if (rateLimited) return rateLimited;

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

    // Check if user has active Play Pass
    if (record?.playPassExpiresAt) {
      const passExpireTime = new Date(record.playPassExpiresAt).getTime();
      if (now < passExpireTime) {
        // User has active Play Pass - no need to use free game
        return res.status(200).json({
          status: API_STATUS.SUCCESS,
          data: {
            hasActivePass: true,
            playPassExpiresAt: passExpireTime,
            message: 'You have an active Play Pass. Enjoy unlimited games!',
          },
        });
      }
    }

    // Check if free game is available
    if (record?.freeGameUsed) {
      // Check if cooldown has expired
      if (record.cooldownEndsAt) {
        const cooldownEndTime = new Date(record.cooldownEndsAt).getTime();
        if (now < cooldownEndTime) {
          return res.status(400).json({
            status: API_STATUS.ERROR,
            error: 'Free game already used. Wait for cooldown or purchase Play Pass.',
            errorCode: 'free_game_used',
            cooldownEndsAt: cooldownEndTime,
            cooldownRemainingMs: cooldownEndTime - now,
          });
        }
      }
    }

    // Calculate cooldown end time (12 hours from now)
    const cooldownEndsAt = new Date(now + BARN_GAME_CONFIG.cooldownDuration);
    const today = new Date().toISOString().split('T')[0];

    if (record) {
      // Update existing record - mark free game as used and start cooldown
      await db
        .update(barnGameAttempts)
        .set({
          freeGameUsed: true,
          cooldownEndsAt,
          hasActiveGame: true,
          lastPlayedDate: today,
          updatedAt: new Date(),
        } as Partial<typeof barnGameAttempts.$inferInsert>)
        .where(eq(barnGameAttempts.userId, auth.user.id));
    } else {
      // Create new record - first game
      await db
        .insert(barnGameAttempts)
        .values({
          userId: auth.user.id,
          freeGameUsed: true,
          cooldownEndsAt,
          hasActiveGame: true,
          lastPlayedDate: today,
        } as typeof barnGameAttempts.$inferInsert);
    }

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        freeGameUsed: true,
        cooldownEndsAt: cooldownEndsAt.getTime(),
        cooldownDurationMs: BARN_GAME_CONFIG.cooldownDuration,
        message: 'Free game started! After this game, wait 12 hours or purchase Play Pass.',
      },
    });
  } catch (error) {
    console.error('Use free game error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
