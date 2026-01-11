/**
 * POST /api/auth/logout
 * Invalidate user session
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractBearerToken, invalidateSession } from '../../lib/services/auth.js';
import { API_STATUS } from '../../lib/config/constants.js';

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

  try {
    const token = extractBearerToken(req.headers.authorization || null);

    if (token) {
      await invalidateSession(token);
    }

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success even if there's an error
    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      message: 'Logged out',
    });
  }
}
