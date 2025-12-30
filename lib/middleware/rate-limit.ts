/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP/user
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SECURITY_CONFIG, API_STATUS, ERROR_MESSAGES } from '../config/constants';

// In-memory store for rate limiting
// In production, use Redis or a similar distributed cache
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Get client identifier for rate limiting
 * Uses IP address or forwarded headers
 */
function getClientIdentifier(req: VercelRequest): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }

  // Check for real IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to socket address
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Rate limit configuration per endpoint type
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  // Strict limits for sensitive operations
  '/api/verify/world-id': { windowMs: 60000, maxRequests: 10 },
  '/api/claim/daily-bonus': { windowMs: 60000, maxRequests: 5 },
  '/api/barn/purchase': { windowMs: 60000, maxRequests: 10 },
  '/api/auth/login': { windowMs: 60000, maxRequests: 20 },

  // Standard limits for other endpoints
  default: SECURITY_CONFIG.rateLimit,
};

/**
 * Get rate limit config for an endpoint
 */
function getRateLimitConfig(path: string): RateLimitConfig {
  return ENDPOINT_LIMITS[path] || ENDPOINT_LIMITS.default;
}

/**
 * Check rate limit for a request
 * Returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  req: VercelRequest,
  customConfig?: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const clientId = getClientIdentifier(req);
  const path = req.url?.split('?')[0] || '/api';
  const config = customConfig || getRateLimitConfig(path);

  // Create a unique key for this client + endpoint
  const key = `${clientId}:${path}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment request count
  entry.count++;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.max(0, entry.resetAt - now);

  return {
    allowed: entry.count <= config.maxRequests,
    remaining,
    resetIn,
  };
}

/**
 * Rate limit middleware wrapper for Vercel serverless functions
 * Use this to wrap your handler function
 */
export function withRateLimit(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>,
  customConfig?: RateLimitConfig
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const { allowed, remaining, resetIn } = checkRateLimit(req, customConfig);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetIn / 1000).toString());

    if (!allowed) {
      return res.status(429).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.RATE_LIMITED,
        retryAfter: Math.ceil(resetIn / 1000),
      });
    }

    return handler(req, res);
  };
}

/**
 * Rate limit check that can be used inline in handlers
 * Returns null if allowed, or a response object if rate limited
 */
export function rateLimitCheck(
  req: VercelRequest,
  res: VercelResponse,
  customConfig?: RateLimitConfig
): VercelResponse | null {
  const { allowed, remaining, resetIn } = checkRateLimit(req, customConfig);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetIn / 1000).toString());

  if (!allowed) {
    return res.status(429).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.RATE_LIMITED,
      retryAfter: Math.ceil(resetIn / 1000),
    });
  }

  return null;
}

/**
 * Get current rate limit status for a client
 * Useful for debugging or monitoring
 */
export function getRateLimitStatus(
  req: VercelRequest,
  path?: string
): { count: number; remaining: number; resetAt: Date } | null {
  const clientId = getClientIdentifier(req);
  const endpoint = path || req.url?.split('?')[0] || '/api';
  const key = `${clientId}:${endpoint}`;
  const config = getRateLimitConfig(endpoint);

  const entry = rateLimitStore.get(key);
  if (!entry) {
    return {
      count: 0,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }

  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}
