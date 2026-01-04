/**
 * Record Claim API Endpoint
 * Records a successful token claim after on-chain transaction
 *
 * POST /api/claim/record
 * Body: { claimType: "daily_bonus" | "game_reward", amount: string, txHash: string }
 * Headers: Authorization: Bearer <jwt>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionToken } from '../../lib/services/auth';
import { db } from '../../lib/db';
import { claimTransactions, dailyBonusClaims, users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { TOKEN_CONFIG } from '../../lib/config/constants';

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

    if (!user) {
      return res.status(404).json({ status: 'error', error: 'User not found' });
    }

    // Parse request body
    const { claimType, amount, txHash } = req.body as {
      claimType: 'daily_bonus' | 'game_reward';
      amount: string;
      txHash: string;
    };

    if (!claimType || !amount || !txHash) {
      return res.status(400).json({
        status: 'error',
        error: 'claimType, amount, and txHash are required',
      });
    }

    // Validate tokenAddress is configured
    if (!TOKEN_CONFIG.tokenAddress) {
      console.error('Record claim error: REWARD_TOKEN_ADDRESS not configured');
      return res.status(500).json({
        status: 'error',
        error: 'Token configuration missing. Please contact support.',
        errorCode: 'token_not_configured',
      });
    }

    // Record the claim transaction
    // Note: amount is stored as TEXT in schema (for precision with large numbers)
    // tokenAddress is REQUIRED (notNull constraint in schema)
    const [transaction] = await db
      .insert(claimTransactions)
      .values({
        userId: user.id,
        claimType,
        amount: amount, // Keep as string - schema expects TEXT type
        tokenAddress: TOKEN_CONFIG.tokenAddress, // CRITICAL: Required field was missing!
        status: 'confirmed',
        txHash,
        confirmedAt: new Date(),
      } as typeof claimTransactions.$inferInsert)
      .returning();

    // If daily bonus, also record in dailyBonusClaims
    if (claimType === 'daily_bonus') {
      const today = new Date().toISOString().split('T')[0];
      await db.insert(dailyBonusClaims).values({
        userId: user.id,
        claimDate: today,
        amount: amount, // Keep as string - schema expects TEXT type
        transactionId: transaction.id,
      } as typeof dailyBonusClaims.$inferInsert);
    }

    return res.status(200).json({
      status: 'success',
      data: {
        claimId: transaction.id,
        message: 'Claim recorded successfully',
      },
    });
  } catch (error) {
    console.error('Record claim error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
    });
  }
}
