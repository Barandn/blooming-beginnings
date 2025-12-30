/**
 * POST /api/scores/submit
 * Submit game score with server-side validation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { validateAndSaveScore, type ScoreSubmission } from '../../lib/services/score-validation.js';
import { clearLeaderboardCache } from '../../lib/services/leaderboard.js';
import { API_STATUS, ERROR_MESSAGES } from '../../lib/config/constants.js';

// Request validation schema
const scoreSchema = z.object({
  gameType: z.enum(['barn_game', 'harvest', 'daily_farming']),
  score: z.number().int().min(0),
  monthlyProfit: z.number().int().min(0),
  sessionId: z.string().uuid().optional(),
  gameStartedAt: z.number().positive(),
  gameEndedAt: z.number().positive(),
  validationData: z.record(z.unknown()).optional(),
});

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

  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Validate request body
    const parseResult = scoreSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // Validate time ordering
    if (data.gameEndedAt <= data.gameStartedAt) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'Invalid game timing',
        errorCode: 'invalid_timing',
      });
    }

    // Create submission object
    const submission: ScoreSubmission = {
      userId: auth.user.id,
      gameType: data.gameType,
      score: data.score,
      monthlyProfit: data.monthlyProfit,
      sessionId: data.sessionId,
      gameStartedAt: data.gameStartedAt,
      gameEndedAt: data.gameEndedAt,
      validationData: data.validationData,
    };

    // Validate and save score
    const result = await validateAndSaveScore(submission);

    if (!result.valid) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: result.error,
        errorCode: result.errorCode,
        flags: result.flags,
      });
    }

    // Clear leaderboard cache since scores changed
    clearLeaderboardCache();

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        scoreId: result.score?.id,
        score: result.score?.score,
        monthlyProfit: result.score?.monthlyProfit,
        leaderboardPeriod: result.score?.leaderboardPeriod,
        flags: result.flags,
      },
    });
  } catch (error) {
    console.error('Score submission error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
