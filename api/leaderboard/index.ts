/**
 * GET /api/leaderboard
 * Get leaderboard rankings (moves + time based)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import {
  getLeaderboard,
  getUserRank,
  getLeaderboardStats,
  getAvailablePeriods,
} from '../../lib/services/leaderboard.js';
import { getCurrentPeriod } from '../../lib/services/score-validation.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const period = (req.query.period as string) || getCurrentPeriod();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const includeStats = req.query.stats === 'true';

    // Get authenticated user (optional)
    const auth = await getAuthenticatedUser(req.headers.authorization || null);

    // Get leaderboard
    const leaderboard = await getLeaderboard(period, limit);

    // Get user's rank if authenticated
    let userRank = null;
    if (auth.user) {
      const rankData = await getUserRank(auth.user.id, period);
      if (rankData.rank) {
        userRank = {
          rank: rankData.rank,
          bestMoves: rankData.entry?.bestMoves,
          bestTime: rankData.entry?.bestTime,
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
          walletAddress: `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`,
          bestMoves: entry.bestMoves,
          bestTime: entry.bestTime,
          gamesPlayed: entry.gamesPlayed,
        })),
        totalPlayers: leaderboard.totalPlayers,
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
