/**
 * GET /api/auth/siwe/nonce
 * Generate a nonce for SIWE (Sign In With Ethereum) authentication
 *
 * Simple SIWE implementation following World App MiniKit guidelines
 * Uses Supabase for database operations
 * Reference: https://docs.world.org/mini-apps/commands/wallet-auth
 */

import type { ApiRequest, ApiResponse } from '../../../lib/types/http.js';
import crypto from 'crypto';
import { supabase } from '../../../lib/db/index.js';
import { API_STATUS } from '../../../lib/config/constants.js';

// Nonce expires after 5 minutes
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Generate a cryptographically secure nonce
 * At least 8 alphanumeric characters as required by World App
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Clean up expired nonces from database
 */
async function cleanupExpiredNonces(): Promise<void> {
  try {
    await supabase
      .from('siwe_nonces')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Failed to cleanup expired nonces:', error);
  }
}

/**
 * Validate and consume a nonce (one-time use)
 */
export async function validateAndConsumeNonce(nonce: string): Promise<boolean> {
  try {
    // Get the nonce
    const { data: nonceRecord, error } = await supabase
      .from('siwe_nonces')
      .select('*')
      .eq('nonce', nonce)
      .limit(1)
      .single();

    if (error || !nonceRecord) {
      return false;
    }

    // Check if expired
    if (new Date() > new Date(nonceRecord.expires_at)) {
      await supabase.from('siwe_nonces').delete().eq('nonce', nonce);
      return false;
    }

    // Check if already consumed
    if (nonceRecord.consumed_at) {
      return false;
    }

    // Consume the nonce (mark as used)
    const { error: updateError } = await supabase
      .from('siwe_nonces')
      .update({ consumed_at: new Date().toISOString() })
      .eq('nonce', nonce);

    if (updateError) {
      console.error('Failed to consume nonce:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Nonce validation error:', error);
    return false;
  }
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  try {
    // Clean up old nonces periodically (non-blocking)
    cleanupExpiredNonces().catch(() => {});

    // Generate new nonce
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

    // Store nonce in database
    const { error } = await supabase
      .from('siwe_nonces')
      .insert({
        nonce,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error('Failed to store nonce:', error);
      return res.status(500).json({
        status: API_STATUS.ERROR,
        error: 'Failed to generate nonce',
      });
    }

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
