/**
 * GET /api/user/profile
 * Get authenticated user's profile and game stats
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { getUserStats, getUserRecentGames, getCurrentPeriod } from '../../lib/services/score-validation.js';
import { getUserRank } from '../../lib/services/leaderboard.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    // Require authentication
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: 'error',
        error: auth.error || 'Unauthorized',
      });
    }

    const user = auth.user;

    // Get game statistics
    const stats = await getUserStats(user.id);

    // Get current month rank
    const currentPeriod = getCurrentPeriod();
    const { rank, entry } = await getUserRank(user.id, currentPeriod);

    // Get recent games
    const recentGames = await getUserRecentGames(user.id, 10);

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          verificationLevel: user.verificationLevel,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        stats: {
          totalGames: stats.totalGames,
          bestMoves: stats.bestMoves,
          bestTime: stats.bestTime,
          averageMoves: stats.averageMoves,
          averageTime: stats.averageTime,
        },
        leaderboard: {
          period: currentPeriod,
          rank: rank,
          bestMoves: entry?.bestMoves || null,
          bestTime: entry?.bestTime || null,
        },
        recentGames: recentGames.map(game => ({
          id: game.id,
          moves: game.moves,
          timeSeconds: game.timeSeconds,
          matchedPairs: game.matchedPairs,
          createdAt: game.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
    });
  }
}
