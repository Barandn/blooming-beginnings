/**
 * API Client for MiniKit Backend
 * Handles all API calls to the backend services
 */

const API_BASE = '/api';

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
  const token = localStorage.getItem('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
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
// World ID Verification API
// ============================

export interface WorldIDProof {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
}

export interface VerifyWorldIDRequest {
  proof: WorldIDProof;
  walletAddress: string;
  action?: string;
  signal?: string;
}

export interface VerifyWorldIDResponse {
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

export async function verifyWorldID(
  data: VerifyWorldIDRequest
): Promise<ApiResponse<VerifyWorldIDResponse>> {
  const result = await apiCall<VerifyWorldIDResponse>('/verify/world-id', {
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
  gameType: 'barn_game' | 'harvest' | 'daily_farming';
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
// Daily Bonus API
// ============================

export interface ClaimDailyBonusRequest {
  proof: WorldIDProof;
  signal?: string;
}

export interface ClaimDailyBonusResponse {
  claimId: string;
  amount: string;
  txHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
}

export async function claimDailyBonus(
  data: ClaimDailyBonusRequest
): Promise<ApiResponse<ClaimDailyBonusResponse>> {
  return apiCall<ClaimDailyBonusResponse>('/claim/daily-bonus', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
    barnGameBestScore: number;
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

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export function clearAuthState(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}

// ============================
// Barn Game API
// ============================

export interface BarnGameStatusResponse {
  attemptsRemaining: number;
  isInCooldown: boolean;
  cooldownEndsAt: number | null;
  cooldownRemainingMs: number;
  totalCoinsWonToday: number;
  matchesFoundToday: number;
  canPlay: boolean;
  purchasePrice: {
    WLD: string;
    USDC: string;
  };
}

export async function getBarnGameStatus(): Promise<ApiResponse<BarnGameStatusResponse>> {
  return apiCall<BarnGameStatusResponse>('/barn/status');
}

export interface BarnGamePurchaseRequest {
  paymentReference: string;
  transactionId?: string;
  tokenSymbol: 'WLD' | 'USDC';
}

export interface BarnGamePurchaseResponse {
  purchaseId: string;
  attemptsGranted: number;
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
