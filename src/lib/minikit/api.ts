/**
 * API Configuration
 * Backend API Routes
 * URL format: /api/{endpoint}
 */

// API Response type
interface ApiResponse<T> {
  status: 'success' | 'error' | 'pending';
  data?: T;
  error?: string;
  errorCode?: string;
}

// Helper function for API calls
/**
 * Sanitize and validate a bearer token before using in HTTP headers.
 * Returns null if token is invalid, corrupt, or contains forbidden characters.
 */
function sanitizeBearerToken(value: string | null): string | null {
  if (!value) return null;

  // Remove leading/trailing whitespace
  let t = value.trim();
  
  // Check for null/undefined string representations
  if (!t || t === 'undefined' || t === 'null' || t === '[object Object]') {
    return null;
  }

  // Remove multiple layers of accidental wrapping quotes (can happen with JSON.stringify abuse)
  let prevLength = -1;
  while (t.length !== prevLength) {
    prevLength = t.length;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      t = t.slice(1, -1).trim();
    }
  }

  // RFC 7230: Header field values MUST NOT contain:
  // - Control characters (0x00-0x1F, 0x7F)
  // - Line breaks (\r, \n)
  // - Tabs, form feeds, vertical tabs
  const forbiddenCharsRegex = /[\x00-\x1F\x7F\r\n\t\f\v]/;
  if (forbiddenCharsRegex.test(t)) {
    console.warn('[Auth] Token contains forbidden control characters');
    return null;
  }

  // Check for any whitespace in token (JWT should have none)
  if (/\s/.test(t)) {
    console.warn('[Auth] Token contains whitespace');
    return null;
  }

  // Validate JWT structure: exactly 3 base64url-encoded segments separated by dots
  const parts = t.split('.');
  if (parts.length !== 3) {
    console.warn('[Auth] Token is not a valid JWT (expected 3 parts)');
    return null;
  }

  // Validate each part is valid base64url (alphanumeric, -, _, no padding required)
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  for (const part of parts) {
    if (!part || !base64urlRegex.test(part)) {
      console.warn('[Auth] Token contains invalid base64url segment');
      return null;
    }
  }

  // Final length sanity check (JWT shouldn't be too short or absurdly long)
  if (t.length < 50 || t.length > 4096) {
    console.warn('[Auth] Token length is suspicious:', t.length);
    return null;
  }

  return t;
}

/**
 * Clear all auth-related data from localStorage
 */
function clearAuthStorage(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  // Also clear any Supabase auth tokens that might be corrupted
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') && key.includes('-auth-token'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    console.warn('[Auth] Clearing potentially corrupted Supabase key:', key);
    localStorage.removeItem(key);
  });
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const rawToken = localStorage.getItem('auth_token');
  const token = sanitizeBearerToken(rawToken);
  
  // If raw token exists but sanitized version is null, the token was corrupt
  if (rawToken && !token) {
    console.warn('[Auth] Clearing malformed auth_token in localStorage');
    clearAuthStorage();
  }

  let headers: Record<string, string>;
  try {
    headers = {
      'Content-Type': 'application/json',
    };
    
    // Only add Authorization header if token is valid
    if (token) {
      // Double-check the header value before assignment
      const authValue = `Bearer ${token}`;
      // Validate the complete header value one more time
      if (!/[\x00-\x1F\x7F\r\n]/.test(authValue)) {
        headers['Authorization'] = authValue;
      } else {
        console.warn('[Auth] Constructed Authorization header contains invalid characters');
        clearAuthStorage();
      }
    }
    
    // Merge additional headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
  } catch (err) {
    // If header construction itself fails for any reason, nuke token and continue without it
    console.error('[Auth] Header construction failed:', err);
    clearAuthStorage();
    headers = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
  }

  // Build API URL for API routes: /auth/login -> /api/auth/login
  const url = `/api${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        status: 'error',
        error: data.error || 'Request failed',
        errorCode: data.errorCode,
      };
    }

    return data;
  } catch (error) {
    // WebKit can throw: DOMException: "The string did not match the expected pattern"
    const message = error instanceof Error ? error.message : String(error);
    const isHeaderPatternError =
      /did not match the expected pattern/i.test(message) ||
      /Failed to execute 'fetch'/i.test(message) ||
      /Failed to construct 'Headers'/i.test(message) ||
      /Invalid header/i.test(message);

    if (isHeaderPatternError) {
      // Token or headers are corrupt; clear everything and retry the request WITHOUT token
      console.warn('[Auth] Header pattern error detected, clearing all auth data and retrying...');
      clearAuthStorage();

      // Retry the same request without Authorization header
      try {
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (options.headers) {
          // Only add safe headers from original request
          const originalHeaders = options.headers as Record<string, string>;
          for (const [key, value] of Object.entries(originalHeaders)) {
            if (key.toLowerCase() !== 'authorization' && !/[\x00-\x1F\x7F\r\n]/.test(value)) {
              retryHeaders[key] = value;
            }
          }
        }
        
        const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
        const retryData = await retryResponse.json();

        if (!retryResponse.ok) {
          return {
            status: 'error',
            error: retryData.error || 'Request failed',
            errorCode: retryData.errorCode,
          };
        }
        return retryData;
      } catch (retryError) {
        return {
          status: 'error',
          error: retryError instanceof Error ? retryError.message : 'Network error',
        };
      }
    }

    return {
      status: 'error',
      error: message || 'Network error',
    };
  }
}

// ============================
// Auth API
// ============================

export async function logout(): Promise<ApiResponse<{ message: string }>> {
  const result = await apiCall<{ message: string }>('/auth/logout', {
    method: 'POST',
  });

  // Clear local storage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');

  return result;
}

// ============================
// SIWE (Sign In With Ethereum) API
// ============================
// World ID Sign-In is deprecated. Using Wallet Auth instead.
// Reference: https://docs.world.org/world-id/sign-in/deprecation

export interface SiweNonceResponse {
  nonce: string;
  expiresIn: number;
}

export async function getSiweNonce(): Promise<ApiResponse<SiweNonceResponse>> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-siwe-nonce`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('getSiweNonce error:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export interface SiweVerifyRequest {
  message: string;
  signature: string;
  address: string;
  nonce: string;
}

export interface SiweVerifyResponse {
  isNewUser: boolean;
  token: string;
  user: {
    id: string;
    walletAddress: string;
    verificationLevel: string;
    createdAt: string;
  };
  expiresAt: string;
}

export async function verifySiwe(
  data: SiweVerifyRequest
): Promise<ApiResponse<SiweVerifyResponse>> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-siwe-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    // Save token and user if successful
    if (result.status === 'success' && result.data) {
      // CRITICAL: Sanitize token before saving to prevent future header errors
      const rawToken = result.data.token;
      if (typeof rawToken === 'string') {
        // Clean the token: trim whitespace, remove any accidental quotes
        let cleanToken = rawToken.trim();
        
        // Remove wrapping quotes if present
        if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || 
            (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
          cleanToken = cleanToken.slice(1, -1).trim();
        }
        
        // Validate it looks like a JWT before saving
        const parts = cleanToken.split('.');
        if (parts.length === 3 && cleanToken.length >= 50) {
          localStorage.setItem('auth_token', cleanToken);
        } else {
          console.error('[Auth] Received invalid token format from server');
          return {
            status: 'error',
            error: 'Invalid token format received from server',
          };
        }
      } else {
        console.error('[Auth] Token is not a string:', typeof rawToken);
        return {
          status: 'error',
          error: 'Invalid token type received from server',
        };
      }
      
      // Safely stringify user data
      try {
        const userJson = JSON.stringify(result.data.user);
        localStorage.setItem('user', userJson);
      } catch (jsonError) {
        console.error('[Auth] Failed to stringify user data:', jsonError);
      }
    }

    return result;
  } catch (error) {
    console.error('verifySiwe error:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================
// Score Submission API
// ============================

export interface SubmitScoreRequest {
  gameType: 'card_match';
  score: number;
  monthlyProfit: number;
  sessionId?: string;
  gameStartedAt: number;
  gameEndedAt: number;
  validationData?: Record<string, unknown>;
}

export interface SubmitScoreResponse {
  scoreId: string;
  score: number;
  monthlyProfit: number;
  leaderboardPeriod: string;
  flags?: string[];
  reward?: {
    amount: string;
    txHash: string;
    explorerUrl: string;
  };
  rewardError?: string;
}

export async function submitScore(
  data: SubmitScoreRequest
): Promise<ApiResponse<SubmitScoreResponse>> {
  return apiCall<SubmitScoreResponse>('/scores/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================
// Gasless Claim API (Signature-based)
// ============================

export interface ClaimSignatureResponse {
  signature: string;
  amount: string;
  claimType: number;
  nonce: number;
  deadline: number;
  contractAddress: string;
}

// Get signature for gasless claim
export async function getClaimSignature(
  claimType: 'daily_bonus' | 'game_reward',
  score?: number
): Promise<ApiResponse<ClaimSignatureResponse>> {
  return apiCall<ClaimSignatureResponse>('/claim/signature', {
    method: 'POST',
    body: JSON.stringify({ claimType, score }),
  });
}

// Record a successful claim after on-chain transaction
export interface RecordClaimResponse {
  claimId: string;
  message: string;
}

export async function recordClaim(
  claimType: 'daily_bonus' | 'game_reward',
  amount: string,
  txHash: string
): Promise<ApiResponse<RecordClaimResponse>> {
  return apiCall<RecordClaimResponse>('/claim/record', {
    method: 'POST',
    body: JSON.stringify({ claimType, amount, txHash }),
  });
}

// ============================
// Daily Bonus API (Legacy - kept for backward compatibility)
// ============================

export interface ClaimDailyBonusResponse {
  claimId: string;
  amount: string;
  streakDay?: number;
  txHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
}

// Legacy: Direct backend transfer (deprecated, use gasless claim instead)
export async function claimDailyBonusLegacy(): Promise<ApiResponse<ClaimDailyBonusResponse>> {
  return apiCall<ClaimDailyBonusResponse>('/claim/daily-bonus', {
    method: 'POST',
  });
}

// Gasless claim interface
export interface GaslessClaimResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  streakDay?: number;
  explorerUrl?: string;
  error?: string;
}

/**
 * Claim daily bonus using gasless transaction via MiniKit
 * Flow: Backend signature → MiniKit sendTransaction → Record claim
 */
export async function claimDailyBonus(): Promise<GaslessClaimResult> {
  // Dynamically import MiniKit functions to avoid circular dependencies
  const { claimTokens, isMiniKitAvailable, ClaimType } = await import('./index');

  // Check if MiniKit is available
  if (!isMiniKitAvailable()) {
    return {
      success: false,
      error: 'MiniKit is not available. Please open this app in World App.',
    };
  }

  // Step 1: Get signature from backend
  const signatureResponse = await getClaimSignature('daily_bonus');

  if (signatureResponse.status !== 'success' || !signatureResponse.data) {
    return {
      success: false,
      error: signatureResponse.error || 'Failed to get claim signature',
    };
  }

  const { signature, amount, claimType, deadline, contractAddress } = signatureResponse.data;

  // Step 2: Send transaction via MiniKit (World App sponsors gas)
  const txResult = await claimTokens({
    amount,
    claimType: claimType as typeof ClaimType[keyof typeof ClaimType],
    deadline,
    signature,
    contractAddress,
  });

  if (txResult.status !== 'success' || !txResult.transaction_id) {
    return {
      success: false,
      error: txResult.error?.message || 'Transaction failed',
    };
  }

  // Step 3: Record the claim in backend
  await recordClaim('daily_bonus', amount, txResult.transaction_id);

  return {
    success: true,
    txHash: txResult.transaction_id,
    amount,
    explorerUrl: `https://worldscan.org/tx/${txResult.transaction_id}`,
  };
}

/**
 * Claim game reward using gasless transaction via MiniKit
 * Flow: Backend signature → MiniKit sendTransaction → Record claim
 */
export async function claimGameReward(score: number): Promise<GaslessClaimResult> {
  // Dynamically import MiniKit functions to avoid circular dependencies
  const { claimTokens, isMiniKitAvailable, ClaimType } = await import('./index');

  // Check if MiniKit is available
  if (!isMiniKitAvailable()) {
    return {
      success: false,
      error: 'MiniKit is not available. Please open this app in World App.',
    };
  }

  // Step 1: Get signature from backend
  const signatureResponse = await getClaimSignature('game_reward', score);

  if (signatureResponse.status !== 'success' || !signatureResponse.data) {
    return {
      success: false,
      error: signatureResponse.error || 'Failed to get claim signature',
    };
  }

  const { signature, amount, claimType, deadline, contractAddress } = signatureResponse.data;

  // Step 2: Send transaction via MiniKit (World App sponsors gas)
  const txResult = await claimTokens({
    amount,
    claimType: claimType as typeof ClaimType[keyof typeof ClaimType],
    deadline,
    signature,
    contractAddress,
  });

  if (txResult.status !== 'success' || !txResult.transaction_id) {
    return {
      success: false,
      error: txResult.error?.message || 'Transaction failed',
    };
  }

  // Step 3: Record the claim in backend
  await recordClaim('game_reward', amount, txResult.transaction_id);

  return {
    success: true,
    txHash: txResult.transaction_id,
    amount,
    explorerUrl: `https://worldscan.org/tx/${txResult.transaction_id}`,
  };
}

// ============================
// Leaderboard API
// ============================

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  monthlyProfit: number;
  totalScore: number;
  gamesPlayed: number;
}

export interface LeaderboardResponse {
  period: string;
  currentPeriod: string;
  availablePeriods: string[];
  entries: LeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  user?: {
    rank: number;
    monthlyProfit: number;
    totalScore: number;
    gamesPlayed: number;
  };
  stats?: {
    totalPlayers: number;
    totalGames: number;
    totalProfit: number;
    averageProfit: number;
  };
}

export async function getLeaderboard(
  period?: string,
  limit?: number,
  offset?: number,
  includeStats?: boolean
): Promise<ApiResponse<LeaderboardResponse>> {
  const params = new URLSearchParams();
  if (period) params.set('period', period);
  if (limit) params.set('limit', limit.toString());
  if (offset) params.set('offset', offset.toString());
  if (includeStats) params.set('stats', 'true');

  return apiCall<LeaderboardResponse>(`/leaderboard?${params.toString()}`);
}

export interface UserLeaderboardResponse {
  period: string;
  rank: number | null;
  entry: {
    monthlyProfit: number;
    totalScore: number;
    gamesPlayed: number;
  } | null;
  stats: {
    monthlyProfit: number;
    cardMatchBestScore: number;
  };
  surroundingEntries: Array<LeaderboardEntry & { isCurrentUser: boolean }>;
}

export async function getUserLeaderboard(
  period?: string
): Promise<ApiResponse<UserLeaderboardResponse>> {
  const params = new URLSearchParams();
  if (period) params.set('period', period);

  return apiCall<UserLeaderboardResponse>(`/leaderboard/user?${params.toString()}`);
}

// ============================
// User Profile API
// ============================

export interface UserProfileResponse {
  user: {
    id: string;
    walletAddress: string;
    verificationLevel: string;
    createdAt: string;
    lastLoginAt: string;
  };
  stats: {
    totalTokensClaimed: string;
    claimCount: number;
    totalGamesPlayed: number;
    totalScore: number;
    bestScore: number;
    currentMonthRank: number | null;
    currentMonthProfit: number;
  };
  dailyBonus: {
    available: boolean;
    claimedToday: boolean;
    cooldownRemainingMs: number;
    amount: string;
    streakCount: number;
    lastClaimDate: string | null;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: string;
    status: string;
    txHash: string | null;
    explorerUrl: string | null;
    createdAt: string;
  }>;
}

export async function getUserProfile(): Promise<ApiResponse<UserProfileResponse>> {
  return apiCall<UserProfileResponse>('/user/profile');
}

// ============================
// Auth State Helpers
// ============================

export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function getStoredUser(): SiweVerifyResponse['user'] | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function getUserData() {
    return getStoredUser();
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export function clearAuthState(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}

// ============================
// Barn Game API (Play Pass System)
// ============================

export interface BarnGameStatusResponse {
  hasActivePass: boolean;
  playPassExpiresAt: number | null;
  playPassRemainingMs: number;
  isInCooldown: boolean;
  cooldownEndsAt: number | null;
  cooldownRemainingMs: number;
  freeGameAvailable: boolean;
  canPlay: boolean;
  totalCoinsWonToday: number;
  matchesFoundToday: number;
  purchasePrice: {
    WLD: string;
  };
  playPassDurationMs: number;
  // Lives system
  lives: number;
  nextLifeAt: number | null;
  nextLifeInMs: number;
}

export async function getBarnGameStatus(): Promise<ApiResponse<BarnGameStatusResponse>> {
  return apiCall<BarnGameStatusResponse>('/barn/status');
}

// Start game - consumes a life
export interface StartGameResponse {
  message: string;
  livesRemaining: number;
  nextLifeAt: number | null;
  attemptsRemaining: number;
}

export async function startBarnGame(): Promise<ApiResponse<StartGameResponse>> {
  return apiCall<StartGameResponse>('/barn/start-game', {
    method: 'POST',
  });
}

// Initiate payment - gets reference ID from backend (secure)
export interface InitiatePaymentRequest {
  tokenSymbol: 'WLD';
  itemType: 'play_pass';
}

export interface InitiatePaymentResponse {
  referenceId: string;
  merchantWallet: string;
  amount: string;
  tokenSymbol: 'WLD';
  expiresAt: number;
  playPassDurationMs: number;
}

export async function initiatePayment(
  data: InitiatePaymentRequest
): Promise<ApiResponse<InitiatePaymentResponse>> {
  return apiCall<InitiatePaymentResponse>('/barn/initiate-payment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface BarnGamePurchaseRequest {
  paymentReference: string;
  transactionId: string;
  tokenSymbol: 'WLD';
}

export interface BarnGamePurchaseResponse {
  purchaseId: string;
  playPassExpiresAt: number;
  playPassDurationMs: number;
  message: string;
}

export async function purchaseBarnGameAttempts(
  data: BarnGamePurchaseRequest
): Promise<ApiResponse<BarnGamePurchaseResponse>> {
  return apiCall<BarnGamePurchaseResponse>('/barn/purchase', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Use free game - starts 12h cooldown
export interface UseFreeGameResponse {
  freeGameUsed?: boolean;
  hasActivePass?: boolean;
  playPassExpiresAt?: number;
  cooldownEndsAt?: number;
  cooldownDurationMs?: number;
  message: string;
}

export async function useFreeGame(): Promise<ApiResponse<UseFreeGameResponse>> {
  return apiCall<UseFreeGameResponse>('/barn/use-free-game', {
    method: 'POST',
  });
}
