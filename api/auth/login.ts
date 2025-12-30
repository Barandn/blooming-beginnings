/**
 * POST /api/auth/login
 * Authenticate user with wallet signature
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticateWallet } from '../../lib/services/auth.js';
import { API_STATUS, ERROR_MESSAGES } from '../../lib/config/constants.js';

// Request validation schema
const loginSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
  timestamp: z.number().positive('Invalid timestamp'),
});

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
    // Validate request body
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: API_STATUS.ERROR,
        error: ERROR_MESSAGES.INVALID_REQUEST,
        details: parseResult.error.errors,
      });
    }

    const payload = parseResult.data;

    // Get request metadata
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress || undefined;

    // Authenticate
    const result = await authenticateWallet(
      {
        walletAddress: payload.walletAddress,
        signature: payload.signature,
        message: payload.message,
        timestamp: payload.timestamp,
      },
      { userAgent, ipAddress }
    );

    if (!result.success) {
      return res.status(401).json({
        status: API_STATUS.ERROR,
        error: result.error,
        errorCode: result.errorCode,
      });
    }

    // Return token and user info
    return res.status(200).json({
      status: API_STATUS.SUCCESS,
      data: {
        token: result.token,
        user: {
          id: result.user?.id,
          walletAddress: result.user?.walletAddress,
          verificationLevel: result.user?.verificationLevel,
          createdAt: result.user?.createdAt,
        },
        expiresAt: result.session?.expiresAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: API_STATUS.ERROR,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
}
