/**
 * POST /api/auth/logout
 * Simple logout - client clears token
 *
 * With JWT-based auth, logout is handled client-side
 * This endpoint exists for API completeness
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
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

  // With JWT-based auth, logout is handled client-side by clearing the token
  // This endpoint just confirms the logout request
  return res.status(200).json({
    status: API_STATUS.SUCCESS,
    message: 'Logged out successfully',
  });
}
