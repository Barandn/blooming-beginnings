/**
 * GET /api/leaderboard/user
 * Get authenticated user's leaderboard position and surrounding entries
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthenticatedUser } from '../../lib/services/auth';
import {
  getUserRank,
  getSurroundingEntries,
} from '../../lib/services/leaderboard';
import { getCurrentPeriod, getUserMonthlyProfit, getUserBestScore } from '../../lib/services/score-validation';
import { API_STATUS, ERROR_MESSAGES } from '../../lib/config/constants';

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
    // Require authentication
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Parse query parameters
    const period = (req.query.period as string) || getCurrentPeriod();
    const surrounding = Math.min(parseInt(req.query.surrounding as string) || 5, 10);

    // Get user's rank
    const { rank, entry } = await getUserRank(auth.user.id, period);

    // Get surrounding entries if user is ranked
    let surroundingEntries: Array<{
      rank: number;
      walletAddress: string;
      monthlyProfit: number;
      totalScore: number;
      gamesPlayed: number;
      isCurrentUser: boolean;
    }> = [];

    if (rank) {
      const entries = await getSurroundingEntries(auth.user.id, period, surrounding);
      surroundingEntries = entries.map(e => ({
        rank: e.rank,
        walletAddress: `${e.walletAddress.slice(0, 6)}...${e.walletAddress.slice(-4)}`,
        monthlyProfit: e.monthlyProfit,
        totalScore: e.totalScore,
        gamesPlayed: e.gamesPlayed,
        isCurrentUser: e.nullifierHash === auth.user!.nullifierHash,
      }));
    }

    // Get additional stats
    const monthlyProfit = await getUserMonthlyProfit(auth.user.id, period);
    const barnBestScore = await getUserBestScore(auth.user.id, 'barn_game');

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        period,
        rank,
        entry: entry ? {
          monthlyProfit: entry.monthlyProfit,
          totalScore: entry.totalScore,
          gamesPlayed: entry.gamesPlayed,
        } : null,
        stats: {
          monthlyProfit,
          barnGameBestScore: barnBestScore,
        },
        surroundingEntries,
      },
    });
  } catch (error) {
    console.error('User leaderboard error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: 'Failed to load user leaderboard data',
    });
  }
}
