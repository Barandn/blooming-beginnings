/**
 * GET /api/auth/sign-message
 * Generate a message for wallet signing (authentication)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSignMessage } from '../../lib/services/auth';
import { API_STATUS } from '../../lib/config/constants';

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

  try {
    const { message, timestamp, nonce } = generateSignMessage();

    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        message,
        timestamp,
        nonce,
      },
    });
  } catch (error) {
    console.error('Sign message generation error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: 'Failed to generate sign message',
    });
  }
}
