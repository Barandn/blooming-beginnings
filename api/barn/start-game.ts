/**
 * POST /api/barn/start-game
 * Start a new barn game - consumes one life
 */

import type { ApiRequest, ApiResponse } from '../../lib/types/http.js';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { consumeLife, LIVES_CONFIG } from '../../lib/services/lives.js';
import { API_STATUS } from '../../lib/config/constants.js';

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
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

    // Try to consume a life
    const result = await consumeLife(user.id);

    if (!result.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: result.error || 'Cannot start game',
        data: {
          livesRemaining: result.livesRemaining,
          nextLifeAt: result.nextLifeAt,
          regenerationHours: LIVES_CONFIG.REGENERATION_HOURS,
        },
      });
    }

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        gameStarted: true,
        livesRemaining: result.livesRemaining,
        nextLifeAt: result.nextLifeAt,
        message: `Game started! You have ${result.livesRemaining} lives remaining.`,
      },
    });
  } catch (error) {
    console.error('Start game error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: 'Failed to start game',
    });
  }
}
