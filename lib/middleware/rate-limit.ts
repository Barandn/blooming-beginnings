/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import { SECURITY_CONFIG, API_STATUS, ERROR_MESSAGES } from '../config/constants';

// In-memory rate limit store
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client identifier from request
 */
function getClientId(headers: Record<string, string | string[] | undefined>): string {
  // Use X-Forwarded-For header if available (for proxied requests)
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }

  // Fallback to remote address or a default
  return 'unknown';
}

/**
 * Check rate limit for a client
 *
 * @param clientId - Client identifier (usually IP)
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(clientId: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const { windowMs, maxRequests } = SECURITY_CONFIG.rateLimit;
  const now = Date.now();

  let entry = rateLimitStore.get(clientId);

  // Create new entry or reset expired one
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(clientId, entry);
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware for API handlers
 */
export function withRateLimit<Req extends { headers: Record<string, string | string[] | undefined> }, Res extends { status: (code: number) => Res; setHeader: (name: string, value: string) => void; json: (data: unknown) => void }>(
  handler: (req: Req, res: Res) => Promise<void> | void
) {
  return async (req: Req, res: Res) => {
    const clientId = getClientId(req.headers);
    const { allowed, remaining, resetTime } = checkRateLimit(clientId);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', SECURITY_CONFIG.rateLimit.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (!allowed) {
      return res.status(429).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.RATE_LIMITED,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }

    return handler(req, res);
  };
}

/**
 * Clean up expired rate limit entries
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();

  for (const [clientId, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(clientId);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupRateLimitStore, 60 * 1000);
