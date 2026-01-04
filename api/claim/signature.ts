/**
 * Claim Signature API Endpoint
 * Generates signatures for gasless token claims
 *
 * POST /api/claim/signature
 * Body: { claimType: "daily_bonus" | "game_reward", score?: number }
 * Headers: Authorization: Bearer <jwt>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionToken } from '../../lib/services/auth';
import {
  generateDailyBonusSignature,
  generateGameRewardSignature,
  ClaimType,
} from '../../lib/services/claim-signature';
import { db } from '../../lib/db';
import { dailyBonusClaims, users } from '../../lib/db/schema';
import { eq, and } from 'drizzle-orm';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', error: 'Missing authorization token' });
    }

    const token = authHeader.slice(7);
    const session = await verifySessionToken(token);

    if (!session) {
      return res.status(401).json({ status: 'error', error: 'Invalid or expired session' });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || !user.walletAddress) {
      return res.status(404).json({ status: 'error', error: 'User not found or no wallet address' });
    }

    // Parse request body
    const { claimType, score } = req.body as {
      claimType: 'daily_bonus' | 'game_reward';
      score?: number;
    };

    if (!claimType) {
      return res.status(400).json({ status: 'error', error: 'claimType is required' });
    }

    // Handle different claim types
    if (claimType === 'daily_bonus') {
      // Check if already claimed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayStr = today.toISOString().split('T')[0];
      const existingClaim = await db
        .select()
        .from(dailyBonusClaims)
        .where(
          and(
            eq(dailyBonusClaims.userId, user.id),
            eq(dailyBonusClaims.claimDate, todayStr)
          )
        )
        .limit(1);

      if (existingClaim.length > 0) {
        return res.status(429).json({
          status: 'error',
          error: 'Daily bonus already claimed today',
          nextClaimAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Generate signature
      const result = await generateDailyBonusSignature(user.walletAddress);

      if (!result.success) {
        return res.status(500).json({ status: 'error', error: result.error });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          signature: result.signature,
          amount: result.amount,
          claimType: ClaimType.DAILY_BONUS,
          nonce: result.nonce,
          deadline: result.deadline,
          contractAddress: result.contractAddress,
        },
      });
    }

    if (claimType === 'game_reward') {
      if (typeof score !== 'number' || score <= 0) {
        return res.status(400).json({ status: 'error', error: 'Valid score is required for game rewards' });
      }

      // Generate signature
      const result = await generateGameRewardSignature(user.walletAddress, score);

      if (!result.success) {
        return res.status(500).json({ status: 'error', error: result.error });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          signature: result.signature,
          amount: result.amount,
          claimType: ClaimType.GAME_REWARD,
          nonce: result.nonce,
          deadline: result.deadline,
          contractAddress: result.contractAddress,
          score,
        },
      });
    }

    return res.status(400).json({ status: 'error', error: 'Invalid claimType' });
  } catch (error) {
    console.error('Claim signature error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
    });
  }
}
