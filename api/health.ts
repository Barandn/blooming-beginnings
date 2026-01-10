/**
 * GET /api/health
 * Health check endpoint for monitoring
 * Uses Supabase for database operations
 */

import type { ApiRequest, ApiResponse } from '../lib/types/http.js';
import { supabase } from '../lib/db/index.js';
import { API_STATUS, ACTIVE_CHAIN } from '../lib/config/constants.js';

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: API_STATUS.ERROR,
      error: 'Method not allowed',
    });
  }

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      database: 'unknown',
      worldChain: 'unknown',
    },
    config: {
      chain: ACTIVE_CHAIN.name,
      chainId: ACTIVE_CHAIN.chainId,
    },
  };

  // Check Supabase database connection
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!error) {
      health.services.database = 'ok';
    } else {
      health.services.database = 'error';
      health.status = 'degraded';
    }
  } catch {
    health.services.database = 'error';
    health.status = 'degraded';
  }

  // Check World Chain RPC
  try {
    const response = await fetch(ACTIVE_CHAIN.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });

    if (response.ok) {
      health.services.worldChain = 'ok';
    } else {
      health.services.worldChain = 'error';
      health.status = 'degraded';
    }
  } catch {
    health.services.worldChain = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return res.status(statusCode).json(health);
}
