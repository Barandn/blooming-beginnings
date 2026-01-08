/**
 * Authentication Service
 * Simple JWT-based authentication for World App Wallet Auth
 *
 * Reference: https://docs.world.org/mini-apps/commands/wallet-auth
 */

import { jwtVerify } from 'jose';
import { db, users, type User } from '../db';
import { eq } from 'drizzle-orm';
import { SESSION_CONFIG, ERROR_MESSAGES } from '../config/constants';

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
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress.toLowerCase()))
    .limit(1);

  return user || null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
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
