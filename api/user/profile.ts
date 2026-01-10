/**
 * GET /api/user/profile
 * Get authenticated user's profile and game stats
 * Uses Supabase for database operations
 */

import type { ApiRequest, ApiResponse } from '../../lib/types/http.js';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import { getUserStats, getUserRecentGames, getCurrentPeriod } from '../../lib/services/score-validation.js';
import { getUserRank } from '../../lib/services/leaderboard.js';

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    // Require authentication
    const auth = await getAuthenticatedUser(req.headers.authorization as string || null);
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
          walletAddress: user.wallet_address,
          verificationLevel: user.verification_level,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        },
        stats: {
          totalGames: stats.totalGames,
          totalScore: stats.totalScore,
          bestScore: stats.bestScore,
          monthlyProfit: stats.monthlyProfit,
          averageScore: stats.averageScore,
        },
        leaderboard: {
          period: currentPeriod,
          rank: rank,
          monthlyProfit: entry?.monthlyProfit || null,
          totalScore: entry?.totalScore || null,
          gamesPlayed: entry?.gamesPlayed || null,
        },
        recentGames: recentGames.map(game => ({
          id: game.id,
          score: game.score,
          monthlyProfit: game.monthly_profit,
          timeTaken: game.time_taken,
          createdAt: game.created_at,
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
