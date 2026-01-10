/**
 * Authentication Service
 * Simple JWT-based authentication for World App Wallet Auth
 * Uses Supabase for database operations
 *
 * Reference: https://docs.world.org/mini-apps/commands/wallet-auth
 */

import { jwtVerify } from 'jose';
import { supabase, type User } from '../db/index.js';
import { SESSION_CONFIG, ERROR_MESSAGES } from '../config/constants.js';

// Types
export interface SessionData {
  userId: string;
  walletAddress: string;
  expiresAt: Date;
}

/**
 * Get JWT secret as Uint8Array
 */
function getJwtSecret(): Uint8Array {
  const secret = SESSION_CONFIG.jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verify and decode JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    return {
      userId: payload.userId as string,
      walletAddress: payload.walletAddress as string,
      expiresAt: new Date((payload.exp || 0) * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
}

/**
 * Create new user
 */
export async function createUser(
  walletAddress: string,
  verificationLevel: string = 'wallet'
): Promise<User | null> {
  const walletAddressLower = walletAddress.toLowerCase();
  const walletNullifier = `wallet_${walletAddressLower}`;

  const { data, error } = await supabase
    .from('users')
    .insert({
      nullifier_hash: walletNullifier,
      wallet_address: walletAddressLower,
      verification_level: verificationLevel,
      last_login_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create user:', error);
    return null;
  }

  return data as User;
}

/**
 * Update user last login
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
  authHeader: string | null
): Promise<{
  user: User | null;
  error?: string;
}> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      user: null,
      error: 'Missing authorization token',
    };
  }

  // Verify JWT
  const sessionData = await verifySessionToken(token);
  if (!sessionData) {
    return {
      user: null,
      error: ERROR_MESSAGES.SESSION_EXPIRED,
    };
  }

  // Get user
  const user = await getUserById(sessionData.userId);
  if (!user) {
    return {
      user: null,
      error: 'User not found',
    };
  }

  return { user };
}
