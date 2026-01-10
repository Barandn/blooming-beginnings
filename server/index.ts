/**
 * Express Server for Replit Deployment
 * Serves static frontend files and API endpoints
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import type { ApiRequest, ApiResponse } from '../lib/types/http.js';

// Import API handlers
import healthHandler from '../api/health.js';
import nonceHandler from '../api/auth/siwe/nonce.js';
import verifyHandler from '../api/auth/siwe/verify.js';
import logoutHandler from '../api/auth/logout.js';
import barnStatusHandler from '../api/barn/status.js';
import startGameHandler from '../api/barn/start-game.js';
import leaderboardHandler from '../api/leaderboard/index.js';
import submitScoreHandler from '../api/scores/submit.js';
import profileHandler from '../api/user/profile.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Adapter to convert Express req/res to API handler format
 */
function createApiAdapter(
  handler: (req: ApiRequest, res: ApiResponse) => Promise<unknown>
) {
  return async (req: Request, res: Response) => {
    // Parse query parameters
    const query: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        query[key] = value;
      } else if (Array.isArray(value)) {
        query[key] = value as string[];
      }
    }

    // Create API request object
    const apiReq = req as unknown as ApiRequest;
    apiReq.query = query;
    apiReq.body = req.body;

    // Create API response object with helper methods
    const apiRes = res as unknown as ApiResponse;
    apiRes.status = (code: number) => {
      res.status(code);
      return apiRes;
    };
    apiRes.json = (data: unknown) => {
      res.json(data);
    };

    try {
      await handler(apiReq, apiRes);
    } catch (error) {
      console.error('API handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({ status: 'error', error: 'Internal server error' });
      }
    }
  };
}

// API Routes
app.get('/api/health', createApiAdapter(healthHandler));
app.get('/api/auth/siwe/nonce', createApiAdapter(nonceHandler));
app.post('/api/auth/siwe/verify', createApiAdapter(verifyHandler));
app.post('/api/auth/logout', createApiAdapter(logoutHandler));
app.get('/api/barn/status', createApiAdapter(barnStatusHandler));
app.post('/api/barn/start-game', createApiAdapter(startGameHandler));
app.get('/api/leaderboard', createApiAdapter(leaderboardHandler));
app.post('/api/scores/submit', createApiAdapter(submitScoreHandler));
app.get('/api/user/profile', createApiAdapter(profileHandler));

// Serve static files from the dist/client directory
const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ status: 'error', error: 'Not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
