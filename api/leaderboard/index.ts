/**
 * GET /api/leaderboard
 * High-performance leaderboard endpoint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import {
  getLeaderboardWithUserContext,
  getLeaderboardStats,
  getPreviousPeriods,
} from '../../lib/services/leaderboard.js';
import { getCurrentPeriod } from '../../lib/services/score-validation.js';
import { API_STATUS, LEADERBOARD_CONFIG } from '../../lib/config/constants.js';

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
    // Parse query parameters
    const period = (req.query.period as string) || getCurrentPeriod();
    const limit = Math.min(
      parseInt(req.query.limit as string) || LEADERBOARD_CONFIG.topEntriesCount,
      LEADERBOARD_CONFIG.topEntriesCount
    );
    const offset = parseInt(req.query.offset as string) || 0;
    const includeStats = req.query.stats === 'true';

    // Get authenticated user (optional for leaderboard)
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    const userId = auth.user?.id;

    // Get leaderboard with user context
    const leaderboard = await getLeaderboardWithUserContext(userId, period, limit);

    // Get statistics if requested
    let stats = null;
    if (includeStats) {
      stats = await getLeaderboardStats(period);
    }

    // Set cache headers for performance
    res.setHeader('Cache-Control', `public, max-age=${LEADERBOARD_CONFIG.cacheDuration}`);

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        period: leaderboard.period,
        currentPeriod: getCurrentPeriod(),
        availablePeriods: getPreviousPeriods(6),
        entries: leaderboard.entries.map(entry => ({
          rank: entry.rank,
          // Mask wallet address for privacy (show first 6 and last 4 chars)
          walletAddress: `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`,
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
        // Include user's own data if authenticated
        user: leaderboard.userEntry ? {
          rank: leaderboard.userRank,
          monthlyProfit: leaderboard.userEntry.monthlyProfit,
          totalScore: leaderboard.userEntry.totalScore,
          gamesPlayed: leaderboard.userEntry.gamesPlayed,
        } : null,
        stats,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: 'Failed to load leaderboard',
    });
  }
}
