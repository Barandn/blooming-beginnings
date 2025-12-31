/**
 * GET /api/auth/siwe/nonce
 * Generate a nonce for SIWE (Sign In With Ethereum) authentication
 *
 * This replaces the deprecated World ID Sign-In flow
 * Reference: https://docs.world.org/world-id/sign-in/deprecation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { API_STATUS } from '../../../lib/config/constants.js';
import { rateLimitCheck } from '../../../lib/middleware/rate-limit.js';

// Store nonces temporarily (in production, use Redis or similar)
// Nonces expire after 5 minutes
const nonceStore = new Map<string, { createdAt: number }>();

// Clean up expired nonces periodically
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [nonce, data] of nonceStore.entries()) {
    if (now - data.createdAt > NONCE_EXPIRY_MS) {
      nonceStore.delete(nonce);
    }
  }
}

// Generate a cryptographically secure nonce
function generateNonce(): string {
  // At least 8 alphanumeric characters as required by World App
  return crypto.randomBytes(16).toString('hex');
}

export function validateAndConsumeNonce(nonce: string): boolean {
  cleanupExpiredNonces();

  const nonceData = nonceStore.get(nonce);
  if (!nonceData) {
    return false;
  }

  const now = Date.now();
  if (now - nonceData.createdAt > NONCE_EXPIRY_MS) {
    nonceStore.delete(nonce);
    return false;
  }

  // Consume the nonce (one-time use)
  nonceStore.delete(nonce);
  return true;
}

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

  // Check rate limit
  const rateLimited = rateLimitCheck(req, res);
  if (rateLimited) return rateLimited;

  try {
    // Clean up old nonces
    cleanupExpiredNonces();

    // Generate new nonce
    const nonce = generateNonce();

    // Store nonce with timestamp
    nonceStore.set(nonce, { createdAt: Date.now() });

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        nonce,
        expiresIn: NONCE_EXPIRY_MS,
      },
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: 'Failed to generate nonce',
    });
  }
}
