/**
 * POST /api/scores/submit
 * Submit game score
 * Uses Supabase for database operations
 */

import type { ApiRequest, ApiResponse } from '../../lib/types/http.js';
import { z } from 'zod';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { saveScore, type ScoreSubmission } from '../../lib/services/score-validation.js';
import { clearLeaderboardCache } from '../../lib/services/leaderboard.js';

// Request validation schema
const scoreSchema = z.object({
  gameType: z.enum(['card_match']),
  score: z.number().int().min(0),
  monthlyProfit: z.number().int().min(0),
  sessionId: z.string().uuid().optional(),
  gameStartedAt: z.number().optional(),
  gameEndedAt: z.number().optional(),
  validationData: z.record(z.unknown()).optional(),
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

    // Calculate time taken if both timestamps provided
    let timeTaken: number | undefined;
    if (data.gameStartedAt && data.gameEndedAt) {
      timeTaken = Math.round((data.gameEndedAt - data.gameStartedAt) / 1000);
    }

    // Create submission
    const submission: ScoreSubmission = {
      userId: auth.user.id,
      gameType: data.gameType,
      score: data.score,
      monthlyProfit: data.monthlyProfit,
      sessionId: data.sessionId,
      timeTaken,
      gameStartedAt: data.gameStartedAt,
      validationData: data.validationData,
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
        score: result.score?.score,
        monthlyProfit: result.score?.monthly_profit,
        period: result.score?.leaderboard_period,
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
