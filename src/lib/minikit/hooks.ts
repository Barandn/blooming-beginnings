/**
 * React Hooks for MiniKit Integration
 */

import { useState, useEffect, useCallback } from 'react';
import { Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import {
  isMiniKitAvailable,
  isInWorldApp,
  requestVerification,
  getMiniKit,
  type VerifyCommandResult,
} from './index';
import {
  verifyWorldID,
  getUserProfile,
  claimDailyBonus,
  isAuthenticated,
  getStoredUser,
  clearAuthState,
  getBarnGameStatus,
  initiatePayment,
  purchaseBarnGameAttempts,
  type UserProfileResponse,
  type WorldIDProof,
  type BarnGameStatusResponse,
} from './api';

// ============================
// useMiniKit Hook
// ============================

interface UseMiniKitReturn {
  isAvailable: boolean;
  isInApp: boolean;
  isLoading: boolean;
}

export function useMiniKit(): UseMiniKitReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMiniKit = () => {
      setIsAvailable(isMiniKitAvailable());
      setIsInApp(isInWorldApp());
      setIsLoading(false);
    };

    checkMiniKit();
    const timer = setTimeout(checkMiniKit, 1000);

    return () => clearTimeout(timer);
  }, []);

  return { isAvailable, isInApp, isLoading };
}

// ============================
// useWorldIDAuth Hook
// ============================

interface UseWorldIDAuthReturn {
  isAuthenticated: boolean;
  isVerifying: boolean;
  user: ReturnType<typeof getStoredUser>;
  error: string | null;
  verify: (walletAddress: string) => Promise<boolean>;
  logout: () => void;
}

export function useWorldIDAuth(): UseWorldIDAuthReturn {
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [isVerifying, setIsVerifying] = useState(false);
  const [user, setUser] = useState(getStoredUser());
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (walletAddress: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);

    try {
      const verifyResult = await requestVerification('verify-human', walletAddress);

      if (verifyResult.status !== 'success' || !verifyResult.proof) {
        setError(verifyResult.error?.message || 'Verification failed');
        return false;
      }

      const proof: WorldIDProof = {
        proof: verifyResult.proof,
        merkle_root: verifyResult.merkle_root!,
        nullifier_hash: verifyResult.nullifier_hash!,
        verification_level: verifyResult.verification_level as 'orb' | 'device',
      };

      const result = await verifyWorldID({
        proof,
        walletAddress,
      });

      if (result.status !== 'success' || !result.data) {
        setError(result.error || 'Backend verification failed');
        return false;
      }

      setUser(result.data.user);
      setIsAuth(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    setUser(null);
    setIsAuth(false);
    setError(null);
  }, []);

  return {
    isAuthenticated: isAuth,
    isVerifying,
    user,
    error,
    verify,
    logout,
  };
}

// ============================
// useUserProfile Hook
// ============================

interface UseUserProfileReturn {
  profile: UserProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserProfile();

      if (result.status !== 'success' || !result.data) {
        setError(result.error || 'Failed to load profile');
        return;
      }

      setProfile(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, isLoading, error, refresh };
}

// ============================
// useDailyBonus Hook
// ============================

interface UseDailyBonusReturn {
  canClaim: boolean;
  cooldownMs: number;
  amount: string;
  isClaiming: boolean;
  error: string | null;
  claim: (walletAddress: string) => Promise<{
    success: boolean;
    txHash?: string;
    explorerUrl?: string;
  }>;
}

export function useDailyBonus(profile: UserProfileResponse | null): UseDailyBonusReturn {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

  useEffect(() => {
    if (!profile?.dailyBonus) return;

    setCooldownMs(profile.dailyBonus.cooldownRemainingMs);

    if (profile.dailyBonus.cooldownRemainingMs <= 0) return;

    const interval = setInterval(() => {
      setCooldownMs(prev => {
        const newValue = prev - 1000;
        if (newValue <= 0) {
          clearInterval(interval);
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.dailyBonus]);

  const claim = useCallback(async (walletAddress: string) => {
    setIsClaiming(true);
    setError(null);

    try {
      const verifyResult = await requestVerification('claim-daily-bonus', walletAddress);

      if (verifyResult.status !== 'success' || !verifyResult.proof) {
        setError(verifyResult.error?.message || 'Verification failed');
        return { success: false };
      }

      const proof: WorldIDProof = {
        proof: verifyResult.proof,
        merkle_root: verifyResult.merkle_root!,
        nullifier_hash: verifyResult.nullifier_hash!,
        verification_level: verifyResult.verification_level as 'orb' | 'device',
      };

      const result = await claimDailyBonus({
        proof,
        signal: walletAddress,
      });

      if (result.status !== 'success' || !result.data) {
        setError(result.error || 'Claim failed');
        return { success: false };
      }

      return {
        success: true,
        txHash: result.data.txHash,
        explorerUrl: result.data.explorerUrl,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false };
    } finally {
      setIsClaiming(false);
    }
  }, []);

  return {
    canClaim: profile?.dailyBonus?.available ?? false,
    cooldownMs,
    amount: profile?.dailyBonus?.amount ?? '0',
    isClaiming,
    error,
    claim,
  };
}

// ============================
// useGameSession Hook
// ============================

interface UseGameSessionReturn {
  sessionId: string;
  startTime: number;
  startSession: () => void;
  endSession: () => number;
}

export function useGameSession(): UseGameSessionReturn {
  const [sessionId, setSessionId] = useState('');
  const [startTime, setStartTime] = useState(0);

  const startSession = useCallback(() => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
    setSessionId(id);
    setStartTime(Date.now());
  }, []);

  const endSession = useCallback(() => {
    return Date.now();
  }, []);

  return {
    sessionId,
    startTime,
    startSession,
    endSession,
  };
}

// ============================
// useBarnGameStatus Hook
// ============================

interface UseBarnGameStatusReturn {
  status: BarnGameStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBarnGameStatus(): UseBarnGameStatusReturn {
  const [status, setStatus] = useState<BarnGameStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getBarnGameStatus();

      if (result.status !== 'success' || !result.data) {
        setError(result.error || 'Failed to load barn game status');
        return;
      }

      setStatus(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isLoading, error, refresh };
}

// ============================
// useBarnGamePurchase Hook
// ============================

interface UseBarnGamePurchaseReturn {
  isPurchasing: boolean;
  error: string | null;
  purchaseWithWLD: () => Promise<boolean>;
  purchaseWithUSDC: () => Promise<boolean>;
}

export function useBarnGamePurchase(
  onPurchaseSuccess: () => void
): UseBarnGamePurchaseReturn {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executePurchase = useCallback(async (tokenSymbol: 'WLD' | 'USDC'): Promise<boolean> => {
    setIsPurchasing(true);
    setError(null);

    try {
      if (!isMiniKitAvailable()) {
        setError('World App required. Please open from within World App.');
        return false;
      }

      const minikit = getMiniKit();

      const initResult = await initiatePayment({
        tokenSymbol,
        itemType: 'barn_game_attempts',
      });

      if (initResult.status !== 'success' || !initResult.data) {
        setError(initResult.error || 'Failed to initiate payment');
        return false;
      }

      const { referenceId, merchantWallet, amount } = initResult.data;

      const tokenEnum = tokenSymbol === 'WLD' ? Tokens.WLD : Tokens.USDC;
      const tokenAmountDecimal = tokenToDecimals(parseFloat(amount), tokenEnum).toString();

      const payResult = await minikit.commandsAsync.pay({
        reference: referenceId,
        to: merchantWallet,
        tokens: [
          {
            symbol: tokenEnum,
            token_amount: tokenAmountDecimal,
          },
        ],
        description: 'Card Game - 10 Matching Attempts',
      });

      const payPayload = payResult.finalPayload as any;
      
      if (!payPayload?.transaction_id) {
        setError('Payment failed');
        return false;
      }

      const verifyResult = await purchaseBarnGameAttempts({
        paymentReference: referenceId,
        transactionId: payPayload.transaction_id,
        tokenSymbol,
      });

      if (verifyResult.status !== 'success') {
        if (verifyResult.status === 'pending') {
          setError('Payment processing. Please wait a few seconds and try again.');
        } else {
          setError(verifyResult.error || 'Purchase verification failed');
        }
        return false;
      }

      onPurchaseSuccess();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [onPurchaseSuccess]);

  const purchaseWithWLD = useCallback(() => executePurchase('WLD'), [executePurchase]);
  const purchaseWithUSDC = useCallback(() => executePurchase('USDC'), [executePurchase]);

  return {
    isPurchasing,
    error,
    purchaseWithWLD,
    purchaseWithUSDC,
  };
}
