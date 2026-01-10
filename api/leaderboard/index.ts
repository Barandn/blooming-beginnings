/**
 * GET /api/leaderboard
 * Get leaderboard rankings (score based)
 * Uses Supabase for database operations
 */

import type { ApiRequest, ApiResponse } from '../../lib/types/http.js';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import {
  getLeaderboard,
  getUserRank,
  getLeaderboardStats,
  getAvailablePeriods,
  getCurrentPeriod,
} from '../../lib/services/leaderboard.js';

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const query = req.query || {};
    const period = (query.period as string) || getCurrentPeriod();
    const limit = Math.min(parseInt(query.limit as string) || 100, 100);
    const offset = parseInt(query.offset as string) || 0;
    const includeStats = query.stats === 'true';

    // Get authenticated user (optional)
    const auth = await getAuthenticatedUser(req.headers.authorization as string || null);

    // Get leaderboard
    const leaderboard = await getLeaderboard(period, limit);

    // Get user's rank if authenticated
    let userRank = null;
    if (auth.user) {
      const rankData = await getUserRank(auth.user.id, period);
      if (rankData.rank) {
        userRank = {
          rank: rankData.rank,
          monthlyProfit: rankData.entry?.monthlyProfit,
          totalScore: rankData.entry?.totalScore,
          gamesPlayed: rankData.entry?.gamesPlayed,
        };
      }
    }

    // Get statistics if requested
    let stats = null;
    if (includeStats) {
      stats = await getLeaderboardStats(period);
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=60');

    return res.status(200).json({
      status: 'success',
      data: {
        period,
        currentPeriod: getCurrentPeriod(),
        availablePeriods: getAvailablePeriods(6),
        entries: leaderboard.entries.map(entry => ({
          rank: entry.rank,
          // Mask wallet address for privacy
          walletAddress: entry.walletAddress
            ? `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`
            : 'Unknown',
          monthlyProfit: entry.monthlyProfit,
          totalScore: entry.totalScore,
          gamesPlayed: entry.gamesPlayed,
        })),
        pagination: {
          limit,
          offset,
          total: leaderboard.totalPlayers,
          hasMore: offset + limit < leaderboard.totalPlayers,
        },
        user: userRank,
        stats,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Failed to load leaderboard',
    });
  }
}
