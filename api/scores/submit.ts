/**
 * POST /api/scores/submit
 * Submit game score with moves and time
 */

import type { ApiRequest, ApiResponse } from '../../lib/types/http.js';
import { z } from 'zod';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { saveScore, type ScoreSubmission } from '../../lib/services/score-validation.js';
import { clearLeaderboardCache } from '../../lib/services/leaderboard.js';

// Request validation schema
const scoreSchema = z.object({
  gameType: z.enum(['card_match']),
  moves: z.number().int().min(1),
  timeSeconds: z.number().int().min(1),
  matchedPairs: z.number().int().min(0),
  sessionId: z.string().uuid().optional(),
});

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(req.headers.authorization as string || null);
    if (!auth.user) {
      return res.status(401).json({
        status: 'error',
        error: auth.error || 'Unauthorized',
      });
    }

    // Validate request body
    const parseResult = scoreSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid request',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // Create submission
    const submission: ScoreSubmission = {
      userId: auth.user.id,
      gameType: data.gameType,
      moves: data.moves,
      timeSeconds: data.timeSeconds,
      matchedPairs: data.matchedPairs,
      sessionId: data.sessionId,
    };

    // Save score
    const result = await saveScore(submission);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        error: result.error,
      });
    }

    // Clear leaderboard cache
    clearLeaderboardCache();

    return res.status(200).json({
      status: 'success',
      data: {
        scoreId: result.score?.id,
        moves: result.score?.moves,
        timeSeconds: result.score?.timeSeconds,
        matchedPairs: result.score?.matchedPairs,
        period: result.score?.leaderboardPeriod,
      },
    });
  } catch (error) {
    console.error('Score submission error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
    });
  }
}
