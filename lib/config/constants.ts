/**
 * Application Constants and Configuration
 * World Chain and MiniKit settings
 */

// World Chain Network Configuration
export const WORLD_CHAIN = {
  MAINNET: {
    chainId: 480,
    chainIdHex: '0x1e0',
    rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
    blockExplorer: 'https://worldscan.org',
    name: 'World Chain',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  TESTNET: {
    chainId: 4801,
    chainIdHex: '0x12c1',
    rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
    blockExplorer: 'https://worldchain-sepolia.explorer.alchemy.com',
    name: 'World Chain Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
} as const;

// Use mainnet by default, can be overridden by env
export const ACTIVE_CHAIN = process.env.NEXT_PUBLIC_USE_TESTNET === 'true'
  ? WORLD_CHAIN.TESTNET
  : WORLD_CHAIN.MAINNET;

// World ID Configuration
export const WORLD_ID = {
  // App ID from Developer Portal (format: app_xxxxx)
  appId: process.env.WORLD_APP_ID as `app_${string}`,

  // Action ID for verification
  verifyAction: process.env.WORLD_VERIFY_ACTION || 'verify-human',

  // Daily bonus action
  dailyBonusAction: process.env.WORLD_DAILY_BONUS_ACTION || 'claim-daily-bonus',

  // Verification levels
  verificationLevels: {
    ORB: 'orb',
    DEVICE: 'device',
  } as const,

  // API endpoint for cloud verification
  verifyEndpoint: 'https://developer.worldcoin.org/api/v2/verify',
} as const;

// Token Distribution Configuration
export const TOKEN_CONFIG = {
  // ERC20 Token address for rewards (BNG Token)
  tokenAddress: process.env.REWARD_TOKEN_ADDRESS || '',

  // Daily bonus amount in wei (e.g., 200 tokens with 18 decimals)
  dailyBonusAmount: process.env.DAILY_BONUS_AMOUNT || '200000000000000000000',

  // Game reward multiplier (score * multiplier = token reward)
  gameRewardMultiplier: BigInt(process.env.GAME_REWARD_MULTIPLIER || '1000000000000000'),

  // Cooldown period for daily claims (24 hours in milliseconds)
  dailyClaimCooldown: 24 * 60 * 60 * 1000,

  // Maximum claims per day
  maxDailyClaimAttempts: 1,
} as const;

// Session Configuration
export const SESSION_CONFIG = {
  // JWT secret for signing tokens - MUST be set via environment variable
  // Do not provide fallback to prevent insecure defaults
  jwtSecret: process.env.JWT_SECRET,

  // Session duration (7 days)
  sessionDuration: 7 * 24 * 60 * 60 * 1000,

  // Token expiry for JWT
  tokenExpiry: '7d',
} as const;

// Validate critical security configuration at startup
export function validateSecurityConfig(): void {
  if (!SESSION_CONFIG.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required but not set');
  }
  if (SESSION_CONFIG.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

// Security Configuration
export const SECURITY_CONFIG = {
  // Allowed origins for CORS
  allowedOrigins: [
    'https://worldcoin.org',
    'https://world.org',
    'https://app.world.org',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean),

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Anti-cheat: Maximum time for game session (in seconds)
  maxGameSessionTime: 3600, // 1 hour

  // Anti-cheat: Minimum time for game actions (in seconds)
  minGameActionTime: 1,
} as const;

// Barn Game Purchase Configuration
export const BARN_GAME_CONFIG = {
  // Purchase prices for attempt refill
  purchasePriceWLD: '0.1', // 0.1 WLD
  purchasePriceUSDC: '0.25', // 0.25 USDC
  attemptsPerPurchase: 10,
  cooldownDuration: 24 * 60 * 60 * 1000, // 24 hours in ms
  // Token addresses on World Chain
  tokenAddresses: {
    WLD: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003', // WLD on World Chain
    USDC: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', // USDC on World Chain
  },
  // Recipient wallet for payments
  recipientAddress: process.env.BARN_GAME_RECIPIENT_ADDRESS || '',
} as const;

// Game Configuration for Score Validation
export const GAME_VALIDATION = {
  // Barn game settings
  barnGame: {
    maxAttempts: 10,
    maxMatchesPerDay: 10,
    rewardPerMatch: 500, // BNG coins
    minTimeBetweenFlips: 500, // ms
  },

  // Harvest settings
  harvest: {
    minGrowthCycles: 3,
    maxGrowthCycles: 12,
    minTimeBetweenHarvests: 60 * 1000, // 1 minute minimum
  },

  // Score bounds for validation
  scoreBounds: {
    minScore: 0,
    maxDailyScore: 100000,
    maxMonthlyProfit: 10000000,
  },
} as const;

// Leaderboard Configuration
export const LEADERBOARD_CONFIG = {
  // Number of entries to show on main leaderboard
  topEntriesCount: 100,

  // Cache duration in seconds
  cacheDuration: 60,

  // Minimum score to appear on leaderboard
  minimumScore: 0,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_SIGNATURE: 'Invalid wallet signature',
  SESSION_EXPIRED: 'Session has expired',
  UNAUTHORIZED: 'Unauthorized access',

  // World ID errors
  INVALID_PROOF: 'Invalid World ID proof',
  NOT_ORB_VERIFIED: 'Orb verification required',
  DUPLICATE_NULLIFIER: 'This World ID has already been registered',
  VERIFICATION_FAILED: 'World ID verification failed',

  // Claim errors
  COOLDOWN_ACTIVE: 'Daily bonus already claimed. Try again tomorrow.',
  CLAIM_FAILED: 'Token claim failed. Please try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for distribution',

  // Game errors
  INVALID_SCORE: 'Invalid game score submitted',
  SCORE_VALIDATION_FAILED: 'Score validation failed - possible cheat detected',
  GAME_SESSION_EXPIRED: 'Game session has expired',

  // Generic errors
  INTERNAL_ERROR: 'An internal error occurred',
  RATE_LIMITED: 'Too many requests. Please slow down.',
  INVALID_REQUEST: 'Invalid request format',
} as const;

// API Response Status
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
} as const;
