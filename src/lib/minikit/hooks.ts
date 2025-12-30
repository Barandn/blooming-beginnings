/**
 * React Hooks for MiniKit Integration
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isMiniKitAvailable,
  isInWorldApp,
  requestVerification,
  requestWalletAuth,
  VerificationLevel,
  type VerifyCommandResult,
} from './index';
import {
  verifyWorldID,
  getUserProfile,
  claimDailyBonus,
  isAuthenticated,
  getStoredUser,
  clearAuthState,
  type UserProfileResponse,
  type WorldIDProof,
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
    // Check MiniKit availability after a short delay
    // to ensure the SDK is fully loaded
    const checkMiniKit = () => {
      setIsAvailable(isMiniKitAvailable());
      setIsInApp(isInWorldApp());
      setIsLoading(false);
    };

    // Initial check
    checkMiniKit();

    // Also check after a delay in case SDK loads late
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

  // Verify with World ID
  const verify = useCallback(async (walletAddress: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);

    try {
      // Request World ID verification from MiniKit
      const verifyResult = await requestVerification('verify-human', walletAddress);

      if (verifyResult.status !== 'success' || !verifyResult.proof) {
        setError(verifyResult.error?.message || 'Verification failed');
        return false;
      }

      // Verify with backend
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

  // Logout
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

  // Update cooldown timer
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
      // Request World ID verification for claim
      const verifyResult = await requestVerification('claim-daily-bonus', walletAddress);

      if (verifyResult.status !== 'success' || !verifyResult.proof) {
        setError(verifyResult.error?.message || 'Verification failed');
        return { success: false };
      }

      // Claim with backend
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
    // Generate UUID for session
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
