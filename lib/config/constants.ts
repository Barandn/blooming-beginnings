/**
 * Application Constants
 * Simplified configuration for game and authentication
 */

// World Chain Network Configuration
export const WORLD_CHAIN = {
  MAINNET: {
    chainId: 480,
    chainIdHex: '0x1e0',
    rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
    blockExplorer: 'https://worldscan.org',
    name: 'World Chain',
  },
  TESTNET: {
    chainId: 4801,
    chainIdHex: '0x12c1',
    rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
    blockExplorer: 'https://worldchain-sepolia.explorer.alchemy.com',
    name: 'World Chain Sepolia',
  },
} as const;

// Active chain (mainnet by default)
export const ACTIVE_CHAIN = process.env.NEXT_PUBLIC_USE_TESTNET === 'true'
  ? WORLD_CHAIN.TESTNET
  : WORLD_CHAIN.MAINNET;

// Session Configuration
export const SESSION_CONFIG = {
  jwtSecret: process.env.JWT_SECRET,
  sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  tokenExpiry: '7d',
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  allowedOrigins: [
    'https://worldcoin.org',
    'https://world.org',
    'https://app.world.org',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean),
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
} as const;

// Game Configuration
export const GAME_CONFIG = {
  // Card match game (5x5 grid = 24 cards = 12 pairs)
  cardMatch: {
    totalPairs: 12,
    gridSize: 25, // 5x5
    minMoves: 12, // Minimum possible (perfect game)
    maxMoves: 500,
    minTimeSeconds: 10, // Anti-cheat
    maxTimeSeconds: 3600, // 1 hour max
  },
} as const;

// Leaderboard Configuration
export const LEADERBOARD_CONFIG = {
  topEntriesCount: 100,
  cacheDuration: 60, // seconds
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_SIGNATURE: 'Invalid wallet signature',
  SESSION_EXPIRED: 'Session has expired',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_SCORE: 'Invalid game score',
  INTERNAL_ERROR: 'An internal error occurred',
  INVALID_REQUEST: 'Invalid request format',
} as const;

// API Response Status
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
