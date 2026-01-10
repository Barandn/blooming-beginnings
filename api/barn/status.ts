/**
 * GET /api/barn/status
 * Get barn game status including lives system
 */

import type { ApiRequest, ApiResponse } from '../../lib/types/http.js';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { getFullBarnGameStatus, LIVES_CONFIG } from '../../lib/services/lives.js';
import { API_STATUS } from '../../lib/config/constants.js';

// Play pass price
const PLAY_PASS_PRICE = {
  WLD: '0.1',
};

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  try {
    // Get authenticated user
    const { user, error } = await getAuthenticatedUser(req.headers.authorization || null);

    if (!user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: error || 'Unauthorized',
      });
    }

    // Get full barn game status
    const status = await getFullBarnGameStatus(user.id);

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        // Lives system
        lives: status.lives.lives,
        maxLives: status.lives.maxLives,
        nextLifeAt: status.lives.nextLifeAt,
        nextLifeInMs: status.lives.nextLifeInMs,
        canPlay: status.lives.canPlay,

        // Play pass
        hasActivePass: status.hasActivePass,
        playPassExpiresAt: status.playPassExpiresAt,
        playPassRemainingMs: status.playPassRemainingMs,

        // Cooldown
        isInCooldown: status.isInCooldown,
        cooldownEndsAt: status.cooldownEndsAt,
        cooldownRemainingMs: status.cooldownRemainingMs,

        // Free game
        freeGameAvailable: status.freeGameAvailable,

        // Prices
        purchasePrice: PLAY_PASS_PRICE,

        // Config
        livesConfig: {
          maxLives: LIVES_CONFIG.MAX_LIVES,
          regenerationHours: LIVES_CONFIG.REGENERATION_HOURS,
        },
      },
    });
  } catch (error) {
    console.error('Barn status error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: 'Failed to get barn status',
    });
  }
}
