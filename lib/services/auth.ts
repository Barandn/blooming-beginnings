/**
 * Authentication Service
 * Handles wallet signature verification and session management
 */

import { ethers } from 'ethers';
import { SignJWT, jwtVerify } from 'jose';
import { db, users, sessions, type User, type Session } from '../db';
import { eq, and, gt } from 'drizzle-orm';
import { SESSION_CONFIG, ERROR_MESSAGES } from '../config/constants';
import crypto from 'crypto';

// Types
export interface AuthPayload {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
}

export interface SessionData {
  userId: string;
  walletAddress: string;
  nullifierHash: string;
  expiresAt: Date;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  session?: Session;
  error?: string;
  errorCode?: string;
}

// Message template for wallet signing
const SIGN_MESSAGE_TEMPLATE = `Welcome to Blooming Beginnings!

Sign this message to authenticate with your wallet.

Timestamp: {timestamp}
Nonce: {nonce}

This signature does not trigger any blockchain transaction or cost any gas fees.`;

/**
 * Generate a message for wallet signing
 *
 * @returns Message and metadata for signing
 */
export function generateSignMessage(): {
  message: string;
  timestamp: number;
  nonce: string;
} {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');

  const message = SIGN_MESSAGE_TEMPLATE
    .replace('{timestamp}', timestamp.toString())
    .replace('{nonce}', nonce);

  return { message, timestamp, nonce };
}

/**
 * Verify wallet signature
 *
 * @param message - The signed message
 * @param signature - The signature
 * @param expectedAddress - The expected signer address
 * @returns true if signature is valid
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Validate message timestamp to prevent replay attacks
 *
 * @param timestamp - Message timestamp
 * @param maxAgeMs - Maximum age in milliseconds (default 5 minutes)
 * @returns true if timestamp is valid
 */
export function validateMessageTimestamp(
  timestamp: number,
  maxAgeMs: number = 5 * 60 * 1000
): boolean {
  const now = Date.now();
  return timestamp > 0 && (now - timestamp) < maxAgeMs;
}

/**
 * Get JWT secret as Uint8Array
 */
function getJwtSecret(): Uint8Array {
  const secret = SESSION_CONFIG.jwtSecret;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a JWT session token
 *
 * @param sessionData - Session data to encode
 * @returns JWT token string
 */
export async function createSessionToken(sessionData: SessionData): Promise<string> {
  const token = await new SignJWT({
    userId: sessionData.userId,
    walletAddress: sessionData.walletAddress,
    nullifierHash: sessionData.nullifierHash,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_CONFIG.tokenExpiry)
    .sign(getJwtSecret());

  return token;
}

/**
 * Verify and decode JWT session token
 *
 * @param token - JWT token string
 * @returns Decoded session data or null if invalid
 */
export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    return {
      userId: payload.userId as string,
      walletAddress: payload.walletAddress as string,
      nullifierHash: payload.nullifierHash as string,
      expiresAt: new Date((payload.exp || 0) * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Hash a token for secure storage
 *
 * @param token - Token to hash
 * @returns SHA-256 hash of token
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session in database
 *
 * @param userId - User ID
 * @param token - Session token
 * @param walletAddress - Wallet address
 * @param metadata - Optional session metadata
 * @returns Created session
 */
export async function createSession(
  userId: string,
  token: string,
  walletAddress: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<Session> {
  const expiresAt = new Date(Date.now() + SESSION_CONFIG.sessionDuration);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash: hashToken(token),
      walletAddress,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    } as typeof sessions.$inferInsert)
    .returning();

  return session;
}

/**
 * Validate session from database
 *
 * @param token - Session token
 * @returns Session if valid, null otherwise
 */
export async function validateSession(token: string): Promise<Session | null> {
  const tokenHash = hashToken(token);
  const now = new Date();

  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        eq(sessions.isActive, true),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  if (session) {
    // Update last used timestamp
    await db
      .update(sessions)
      .set({ lastUsedAt: now } as Partial<typeof sessions.$inferInsert>)
      .where(eq(sessions.id, session.id));
  }

  return session || null;
}

/**
 * Invalidate a session (logout)
 *
 * @param token - Session token
 */
export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  await db
    .update(sessions)
    .set({ isActive: false } as Partial<typeof sessions.$inferInsert>)
    .where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Invalidate all sessions for a user
 *
 * @param userId - User ID
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ isActive: false } as Partial<typeof sessions.$inferInsert>)
    .where(eq(sessions.userId, userId));
}

/**
 * Get user by wallet address
 *
 * @param walletAddress - Wallet address
 * @returns User if found
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
 * Get user by nullifier hash
 *
 * @param nullifierHash - World ID nullifier hash
 * @returns User if found
 */
export async function getUserByNullifier(nullifierHash: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.nullifierHash, nullifierHash))
    .limit(1);

  return user || null;
}

/**
 * Full authentication flow
 * Verifies signature and creates/updates session
 *
 * @param payload - Auth payload with wallet, signature, message
 * @param metadata - Optional request metadata
 * @returns Auth result with token and user
 */
export async function authenticateWallet(
  payload: AuthPayload,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult> {
  // Validate timestamp
  if (!validateMessageTimestamp(payload.timestamp)) {
    return {
      success: false,
      error: 'Message has expired. Please try again.',
      errorCode: 'message_expired',
    };
  }

  // Verify signature
  if (!verifySignature(payload.message, payload.signature, payload.walletAddress)) {
    return {
      success: false,
      error: ERROR_MESSAGES.INVALID_SIGNATURE,
      errorCode: 'invalid_signature',
    };
  }

  // Get user by wallet
  const user = await getUserByWallet(payload.walletAddress);

  if (!user) {
    return {
      success: false,
      error: 'User not registered. Please verify with World ID first.',
      errorCode: 'user_not_found',
    };
  }

  // Create session token
  const sessionData: SessionData = {
    userId: user.id,
    walletAddress: user.walletAddress,
    nullifierHash: user.nullifierHash,
    expiresAt: new Date(Date.now() + SESSION_CONFIG.sessionDuration),
  };

  const token = await createSessionToken(sessionData);

  // Create session in database
  const session = await createSession(
    user.id,
    token,
    payload.walletAddress,
    metadata
  );

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() } as Partial<typeof users.$inferInsert>)
    .where(eq(users.id, user.id));

  return {
    success: true,
    token,
    user,
    session,
  };
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Get authenticated user from request
 *
 * @param authHeader - Authorization header
 * @returns User and session if authenticated
 */
export async function getAuthenticatedUser(
  authHeader: string | null
): Promise<{
  user: User | null;
  session: Session | null;
  error?: string;
}> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      user: null,
      session: null,
      error: 'Missing authorization token',
    };
  }

  // Verify JWT
  const sessionData = await verifySessionToken(token);
  if (!sessionData) {
    return {
      user: null,
      session: null,
      error: ERROR_MESSAGES.SESSION_EXPIRED,
    };
  }

  // Validate session in database
  const session = await validateSession(token);
  if (!session) {
    return {
      user: null,
      session: null,
      error: ERROR_MESSAGES.SESSION_EXPIRED,
    };
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return {
      user: null,
      session: null,
      error: 'User not found',
    };
  }

  return { user, session };
}
