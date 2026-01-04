/**
 * React Hooks for MiniKit Integration
 */

import { useState, useEffect, useCallback } from 'react';
import { Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import {
  isMiniKitAvailable,
  isInWorldApp,
  getMiniKit,
} from './index';
import {
  getUserProfile,
  claimDailyBonus,
  isAuthenticated,
  getStoredUser,
  clearAuthState,
  getBarnGameStatus,
  initiatePayment,
  purchaseBarnGameAttempts,
  type UserProfileResponse,
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
  claim: () => Promise<{
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

  const claim = useCallback(async () => {
    setIsClaiming(true);
    setError(null);

    try {
      // Daily bonus now uses JWT auth instead of deprecated World ID
      // claimDailyBonus returns GaslessClaimResult directly
      const result = await claimDailyBonus();

      if (!result.success) {
        setError(result.error || 'Claim failed');
        return { success: false };
      }

      return {
        success: true,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
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
// useBarnGamePurchase Hook (Play Pass)
// ============================

interface UseBarnGamePurchaseReturn {
  isPurchasing: boolean;
  error: string | null;
  purchasePlayPass: () => Promise<boolean>;
}

export function useBarnGamePurchase(
  onPurchaseSuccess: () => void
): UseBarnGamePurchaseReturn {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchasePlayPass = useCallback(async (): Promise<boolean> => {
    setIsPurchasing(true);
    setError(null);

    try {
      if (!isMiniKitAvailable()) {
        setError('World App required. Please open from within World App.');
        return false;
      }

      const minikit = getMiniKit();

      const initResult = await initiatePayment({
        tokenSymbol: 'WLD',
        itemType: 'play_pass',
      });

      if (initResult.status !== 'success' || !initResult.data) {
        setError(initResult.error || 'Failed to initiate payment');
        return false;
      }

      const { referenceId, merchantWallet, amount } = initResult.data;

      const tokenAmountDecimal = tokenToDecimals(parseFloat(amount), Tokens.WLD).toString();

      const payResult = await minikit.commandsAsync.pay({
        reference: referenceId,
        to: merchantWallet,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenAmountDecimal,
          },
        ],
        description: 'Play Pass - 1 Hour Unlimited Play',
      });

      const payPayload = payResult.finalPayload as { transaction_id?: string; status?: string };

      if (!payPayload?.transaction_id) {
        setError('Payment failed');
        return false;
      }

      const verifyResult = await purchaseBarnGameAttempts({
        paymentReference: referenceId,
        transactionId: payPayload.transaction_id,
        tokenSymbol: 'WLD',
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

  return {
    isPurchasing,
    error,
    purchasePlayPass,
  };
}
