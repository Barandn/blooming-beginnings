/**
 * CORS Middleware for API Routes
 * Configures Cross-Origin Resource Sharing headers
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SECURITY_CONFIG } from '../config/constants';

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  return SECURITY_CONFIG.allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    // Allow subdomains
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain);
    }
    return false;
  });
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  req: VercelRequest,
  res: VercelResponse
): void {
  const origin = req.headers.origin;

  // Set CORS headers
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For development, allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

/**
 * Handle OPTIONS preflight request
 */
export function handlePreflight(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  if (req.method === 'OPTIONS') {
    applyCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * CORS middleware wrapper for API handlers
 */
export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Apply CORS headers
    applyCorsHeaders(req, res);

    // Handle preflight
    if (handlePreflight(req, res)) {
      return;
    }

    // Call actual handler
    return handler(req, res);
  };
}
