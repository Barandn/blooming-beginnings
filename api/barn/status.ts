/**
 * GET /api/barn/status
 * Get user's barn game status including attempts and cooldown
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

    // Get barn game attempts record
    const [attempts] = await db
      .select()
      .from(barnGameAttempts)
      .where(eq(barnGameAttempts.userId, auth.user.id))
      .limit(1);

    const now = Date.now();

    // If no record exists, user has full attempts
    if (!attempts) {
      return res.status(200).json({
        status: API_STATUS.SUCCESS,
        data: {
          attemptsRemaining: BARN_GAME_CONFIG.attemptsPerPurchase,
          isInCooldown: false,
          cooldownEndsAt: null,
          cooldownRemainingMs: 0,
          totalCoinsWonToday: 0,
          matchesFoundToday: 0,
          canPlay: true,
          purchasePrice: {
            WLD: BARN_GAME_CONFIG.purchasePriceWLD,
            USDC: BARN_GAME_CONFIG.purchasePriceUSDC,
          },
        },
      });
    }

    // Check if cooldown is active
    let isInCooldown = false;
    let cooldownRemainingMs = 0;

    if (attempts.cooldownEndsAt) {
      const cooldownEndTime = new Date(attempts.cooldownEndsAt).getTime();
      if (now < cooldownEndTime) {
        isInCooldown = true;
        cooldownRemainingMs = cooldownEndTime - now;
      } else {
        // Cooldown expired - reset attempts
        await db
          .update(barnGameAttempts)
          .set({
            attemptsRemaining: BARN_GAME_CONFIG.attemptsPerPurchase,
            cooldownStartedAt: null,
            cooldownEndsAt: null,
            hasActiveGame: false,
            totalCoinsWonToday: 0,
            matchesFoundToday: 0,
            updatedAt: new Date(),
          })
          .where(eq(barnGameAttempts.userId, auth.user.id));

        return res.status(200).json({
          status: API_STATUS.SUCCESS,
          data: {
            attemptsRemaining: BARN_GAME_CONFIG.attemptsPerPurchase,
            isInCooldown: false,
            cooldownEndsAt: null,
            cooldownRemainingMs: 0,
            totalCoinsWonToday: 0,
            matchesFoundToday: 0,
            canPlay: true,
            purchasePrice: {
              WLD: BARN_GAME_CONFIG.purchasePriceWLD,
              USDC: BARN_GAME_CONFIG.purchasePriceUSDC,
            },
          },
        });
      }
    }

    const canPlay = !isInCooldown && attempts.attemptsRemaining > 0;

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        attemptsRemaining: attempts.attemptsRemaining,
        isInCooldown,
        cooldownEndsAt: attempts.cooldownEndsAt ? new Date(attempts.cooldownEndsAt).getTime() : null,
        cooldownRemainingMs,
        totalCoinsWonToday: attempts.totalCoinsWonToday,
        matchesFoundToday: attempts.matchesFoundToday,
        canPlay,
        purchasePrice: {
          WLD: BARN_GAME_CONFIG.purchasePriceWLD,
          USDC: BARN_GAME_CONFIG.purchasePriceUSDC,
        },
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
