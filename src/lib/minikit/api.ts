/**
 * API Configuration
 * Backend runs on Vercel API Routes
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
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let token = localStorage.getItem('auth_token');

  // Guard: avoid sending malformed tokens (prevents "did not match expected pattern" errors)
  if (token && token.split('.').length !== 3) {
    console.warn('[Auth] Ignoring malformed auth_token in localStorage');
    localStorage.removeItem('auth_token');
    token = null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Build API URL for Vercel API routes: /auth/login -> /api/auth/login
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
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================
// Auth API
// ============================

export interface SignMessageResponse {
  message: string;
  timestamp: number;
  nonce: string;
}

export async function getSignMessage(): Promise<ApiResponse<SignMessageResponse>> {
  return apiCall<SignMessageResponse>('/auth/sign-message');
}

export interface LoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    walletAddress: string;
    verificationLevel: string;
    createdAt: string;
  };
  expiresAt: string;
}

export async function login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return apiCall<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

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
  return apiCall<SiweNonceResponse>('/auth/siwe/nonce', {
    method: 'GET',
  });
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
  const result = await apiCall<SiweVerifyResponse>('/auth/siwe/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Save token and user if successful
  if (result.status === 'success' && result.data) {
    localStorage.setItem('auth_token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }

  return result;
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

export function getStoredUser(): LoginResponse['user'] | null {
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
}

export async function getBarnGameStatus(): Promise<ApiResponse<BarnGameStatusResponse>> {
  return apiCall<BarnGameStatusResponse>('/barn/status');
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
