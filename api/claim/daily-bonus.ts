/**
 * POST /api/claim/daily-bonus
 * Claim daily token bonus with World ID verification
 * Enforces 24-hour cooldown and Orb-only policy
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { db, claimTransactions, dailyBonusClaims } from '../../lib/db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '../../lib/services/auth.js';
import {
  verifyWorldIDWithOrbPolicy,
  type WorldIDProof,
} from '../../lib/services/worldid.js';
import {
  getTokenDistributionService,
  formatTokenAmount,
} from '../../lib/services/token-distribution.js';
import { rateLimitCheck } from '../../lib/middleware/rate-limit.js';
import {
  API_STATUS,
  WORLD_ID,
  TOKEN_CONFIG,
  ERROR_MESSAGES,
} from '../../lib/config/constants.js';

// Request validation schema
const claimSchema = z.object({
  proof: z.object({
    proof: z.string(),
    merkle_root: z.string(),
    nullifier_hash: z.string(),
    verification_level: z.enum(['orb', 'device']),
  }),
  signal: z.string().optional(),
});

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Check if user has already claimed today
 */
async function hasClaimedToday(userId: string): Promise<boolean> {
  const today = getTodayDate();

  const [claim] = await db
    .select()
    .from(dailyBonusClaims)
    .where(
      and(
        eq(dailyBonusClaims.userId, userId),
        eq(dailyBonusClaims.claimDate, today)
      )
    )
    .limit(1);

  return !!claim;
}

/**
 * Get last claim timestamp for cooldown check
 */
async function getLastClaimTimestamp(userId: string): Promise<Date | null> {
  const [lastClaim] = await db
    .select()
    .from(claimTransactions)
    .where(
      and(
        eq(claimTransactions.userId, userId),
        eq(claimTransactions.claimType, 'daily_bonus'),
        eq(claimTransactions.status, 'confirmed')
      )
    )
    .orderBy(desc(claimTransactions.createdAt))
    .limit(1);

  return lastClaim?.createdAt || null;
}

/**
 * Check 24-hour cooldown
 */
function isCooldownActive(lastClaimTime: Date | null): {
  active: boolean;
  remainingMs?: number;
} {
  if (!lastClaimTime) {
    return { active: false };
  }

  const now = Date.now();
  const lastClaim = lastClaimTime.getTime();
  const cooldownEnd = lastClaim + TOKEN_CONFIG.dailyClaimCooldown;

  if (now < cooldownEnd) {
    return {
      active: true,
      remainingMs: cooldownEnd - now,
    };
  }

  return { active: false };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  // Check rate limit
  const rateLimited = rateLimitCheck(req, res);
  if (rateLimited) return rateLimited;

  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(req.headers.authorization || null);
    if (!auth.user) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: auth.error || ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Validate request body
    const parseResult = claimSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const { proof, signal } = parseResult.data;

    // Step 1: Check if already claimed today
    const alreadyClaimed = await hasClaimedToday(auth.user.id);
    if (alreadyClaimed) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.COOLDOWN_ACTIVE,
        errorCode: 'already_claimed_today',
      });
    }

    // Step 2: Check 24-hour cooldown
    const lastClaimTime = await getLastClaimTimestamp(auth.user.id);
    const cooldown = isCooldownActive(lastClaimTime);

    if (cooldown.active) {
      const remainingHours = Math.ceil((cooldown.remainingMs || 0) / (1000 * 60 * 60));
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: `Daily bonus on cooldown. Try again in ${remainingHours} hours.`,
        errorCode: 'cooldown_active',
        remainingMs: cooldown.remainingMs,
      });
    }

    // Step 3: Verify World ID proof for this claim
    const verifyResult = await verifyWorldIDWithOrbPolicy(
      proof as WorldIDProof,
      WORLD_ID.dailyBonusAction,
      signal || auth.user.walletAddress
    );

    if (!verifyResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: verifyResult.error,
        errorCode: verifyResult.errorCode,
      });
    }

    // Step 4: Verify nullifier matches user
    if (verifyResult.nullifier_hash !== auth.user.nullifierHash) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: 'World ID does not match registered user',
        errorCode: 'nullifier_mismatch',
      });
    }

    // Step 5: Create pending transaction record
    const [transaction] = await db
      .insert(claimTransactions)
      .values({
        userId: auth.user.id,
        claimType: 'daily_bonus',
        amount: TOKEN_CONFIG.dailyBonusAmount,
        tokenAddress: TOKEN_CONFIG.tokenAddress,
        status: 'pending',
      })
      .returning();

    // Step 6: Execute token transfer
    const distributionService = getTokenDistributionService();

    if (!distributionService.isReady()) {
      // Token distribution not configured - mark as pending
      await db
        .update(claimTransactions)
        .set({
          status: 'pending',
          errorMessage: 'Token distribution not configured',
        })
        .where(eq(claimTransactions.id, transaction.id));

      // Still record the daily claim
      await db.insert(dailyBonusClaims).values({
        userId: auth.user.id,
        claimDate: getTodayDate(),
        amount: TOKEN_CONFIG.dailyBonusAmount,
        transactionId: transaction.id,
      });

      return res.status(200).json({
        status: API_STATUS.PENDING,
        message: 'Claim recorded but token transfer pending',
        data: {
          claimId: transaction.id,
          amount: formatTokenAmount(TOKEN_CONFIG.dailyBonusAmount),
          status: 'pending',
        },
      });
    }

    const transferResult = await distributionService.distributeDailyBonus(
      auth.user.walletAddress,
      auth.user.id
    );

    if (!transferResult.success) {
      // Update transaction as failed
      await db
        .update(claimTransactions)
        .set({
          status: 'failed',
          errorMessage: transferResult.error,
        })
        .where(eq(claimTransactions.id, transaction.id));

      return res.status(500).json({
        status: API_STATUS.ERROR,
        error: transferResult.error || ERROR_MESSAGES.CLAIM_FAILED,
        errorCode: transferResult.errorCode,
      });
    }

    // Step 7: Update transaction as confirmed
    await db
      .update(claimTransactions)
      .set({
        status: 'confirmed',
        txHash: transferResult.txHash,
        blockNumber: transferResult.blockNumber,
        confirmedAt: new Date(),
      })
      .where(eq(claimTransactions.id, transaction.id));

    // Step 8: Record daily bonus claim
    await db.insert(dailyBonusClaims).values({
      userId: auth.user.id,
      claimDate: getTodayDate(),
      amount: TOKEN_CONFIG.dailyBonusAmount,
      transactionId: transaction.id,
    });

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        claimId: transaction.id,
        amount: formatTokenAmount(TOKEN_CONFIG.dailyBonusAmount),
        txHash: transferResult.txHash,
        blockNumber: transferResult.blockNumber,
        explorerUrl: `https://worldscan.org/tx/${transferResult.txHash}`,
      },
    });
  } catch (error) {
    console.error('Daily bonus claim error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
