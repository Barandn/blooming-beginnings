/**
 * API Configuration - Cloud-Based Authentication
 * No localStorage - All session data stored in Supabase
 */

import { supabase } from '@/integrations/supabase/client';

// API Response type
interface ApiResponse<T> {
  status: 'success' | 'error' | 'pending';
  data?: T;
  error?: string;
  errorCode?: string;
}

// In-memory session state (no localStorage)
let currentSession: {
  token: string;
  user: SiweVerifyResponse['user'];
  expiresAt: string;
} | null = null;

/**
 * Get the current session token from memory
 */
function getSessionToken(): string | null {
  if (!currentSession) return null;
  
  // Check if expired
  if (new Date(currentSession.expiresAt) < new Date()) {
    currentSession = null;
    return null;
  }
  
  return currentSession.token;
}

/**
 * Set session in memory
 */
function setSession(token: string, user: SiweVerifyResponse['user'], expiresAt: string): void {
  currentSession = { token, user, expiresAt };
}

/**
 * Clear session from memory
 */
export function clearAuthState(): void {
  currentSession = null;
}

/**
 * Get stored user from memory
 */
export function getStoredUser(): SiweVerifyResponse['user'] | null {
  return currentSession?.user || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getSessionToken();
}

/**
 * Get stored token
 */
export function getStoredToken(): string | null {
  return getSessionToken();
}

/**
 * Get user data (alias for getStoredUser)
 */
export function getUserData(): SiweVerifyResponse['user'] | null {
  return getStoredUser();
}

// Helper function for API calls with cloud-based auth
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getSessionToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add Authorization header if we have a valid token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge additional headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  // Build API URL
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
    const message = error instanceof Error ? error.message : String(error);
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
  const token = getSessionToken();
  
  if (token) {
    try {
      // Invalidate session in database
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/auth-logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.error('[Auth] Logout API error:', e);
    }
  }

  // Clear memory state
  clearAuthState();

  return { status: 'success', data: { message: 'Logged out' } };
}

// ============================
// SIWE (Sign In With Ethereum) API
// ============================

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
    console.log('[Auth] Nonce response:', data);
    return data;
  } catch (error) {
    console.error('[Auth] getSiweNonce error:', error);
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
    console.log('[Auth] Verifying SIWE...', { address: data.address, nonce: data.nonce });
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-siwe-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    console.log('[Auth] Verify response:', result);

    // Save session to memory if successful
    if (result.status === 'success' && result.data) {
      const { token, user, expiresAt } = result.data;
      
      if (typeof token === 'string' && token.length > 0) {
        setSession(token, user, expiresAt);
        console.log('[Auth] Session stored in memory for user:', user.id);
      } else {
        console.error('[Auth] Invalid token received');
        return {
          status: 'error',
          error: 'Invalid token received from server',
        };
      }
    }

    return result;
  } catch (error) {
    console.error('[Auth] verifySiwe error:', error);
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

export async function getClaimSignature(
  claimType: 'daily_bonus' | 'game_reward',
  score?: number
): Promise<ApiResponse<ClaimSignatureResponse>> {
  return apiCall<ClaimSignatureResponse>('/claim/signature', {
    method: 'POST',
    body: JSON.stringify({ claimType, score }),
  });
}

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
// Daily Bonus API
// ============================

export interface ClaimDailyBonusResponse {
  claimId: string;
  amount: string;
  streakDay?: number;
  txHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
}

export async function claimDailyBonusLegacy(): Promise<ApiResponse<ClaimDailyBonusResponse>> {
  return apiCall<ClaimDailyBonusResponse>('/claim/daily-bonus', {
    method: 'POST',
  });
}

export interface GaslessClaimResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  streakDay?: number;
  explorerUrl?: string;
  error?: string;
}

export async function claimDailyBonus(): Promise<GaslessClaimResult> {
  const { claimTokens, isMiniKitAvailable, ClaimType } = await import('./index');

  if (!isMiniKitAvailable()) {
    return {
      success: false,
      error: 'MiniKit is not available. Please open this app in World App.',
    };
  }

  const signatureResponse = await getClaimSignature('daily_bonus');

  if (signatureResponse.status !== 'success' || !signatureResponse.data) {
    return {
      success: false,
      error: signatureResponse.error || 'Failed to get claim signature',
    };
  }

  const { signature, amount, claimType, deadline, contractAddress } = signatureResponse.data;

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

  await recordClaim('daily_bonus', amount, txResult.transaction_id);

  return {
    success: true,
    txHash: txResult.transaction_id,
    amount,
    explorerUrl: `https://worldscan.org/tx/${txResult.transaction_id}`,
  };
}

export async function claimGameReward(score: number): Promise<GaslessClaimResult> {
  const { claimTokens, isMiniKitAvailable, ClaimType } = await import('./index');

  if (!isMiniKitAvailable()) {
    return {
      success: false,
      error: 'MiniKit is not available. Please open this app in World App.',
    };
  }

  const signatureResponse = await getClaimSignature('game_reward', score);

  if (signatureResponse.status !== 'success' || !signatureResponse.data) {
    return {
      success: false,
      error: signatureResponse.error || 'Failed to get claim signature',
    };
  }

  const { signature, amount, claimType, deadline, contractAddress } = signatureResponse.data;

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
  lives: number;
  nextLifeAt: number | null;
  nextLifeInMs: number;
}

export async function getBarnGameStatus(): Promise<ApiResponse<BarnGameStatusResponse>> {
  return apiCall<BarnGameStatusResponse>('/barn/status');
}

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
