/**
 * Authentication Context
 * Manages World ID authentication state across the app
 *
 * World App Guidelines Compliant:
 * - Uses World ID for human verification
 * - Stores session in localStorage
 * - Provides auth state to all components
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  verifyWorldID,
  isAuthenticated as checkAuth,
  getStoredUser,
  clearAuthState,
  type WorldIDProof,
} from '@/lib/minikit/api';

// User type from API
interface User {
  id: string;
  walletAddress: string;
  verificationLevel: string;
  createdAt: string;
}

// Auth context state
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerifying: boolean;
  user: User | null;
  error: string | null;
}

// Auth context actions
interface AuthContextValue extends AuthState {
  login: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// World ID Action for verification
const WORLD_ID_ACTION = 'verify-human';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isVerifying: false,
    user: null,
    error: null,
  });

  // Check existing auth on mount
  useEffect(() => {
    const checkExistingAuth = () => {
      const isAuth = checkAuth();
      const user = getStoredUser();

      setState(prev => ({
        ...prev,
        isAuthenticated: isAuth,
        user: user,
        isLoading: false,
      }));
    };

    // Small delay to ensure MiniKit is ready
    const timer = setTimeout(checkExistingAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  // Login with World ID
  const login = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      // Check if MiniKit is available
      if (!MiniKit.isInstalled()) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Bu uygulama sadece World App icinde calisir',
        }));
        return false;
      }

      // Get wallet address from MiniKit
      const walletAddress = MiniKit.walletAddress;
      if (!walletAddress) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Cuzdan adresi alinamadi',
        }));
        return false;
      }

      // Request World ID verification
      const verifyPayload = {
        action: WORLD_ID_ACTION,
        signal: walletAddress,
        verification_level: 'orb' as const, // Orb-only for security
      };

      const verifyResult = await MiniKit.commandsAsync.verify(verifyPayload);

      if (verifyResult.status !== 'success') {
        const errorMessage = verifyResult.finalPayload?.error_code === 'user_rejected'
          ? 'Dogrulama iptal edildi'
          : 'World ID dogrulamasi basarisiz';

        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: errorMessage,
        }));
        return false;
      }

      // Extract proof from result
      const payload = verifyResult.finalPayload;
      if (!payload || !payload.proof) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Dogrulama kaniti alinamadi',
        }));
        return false;
      }

      // Create proof object for backend
      const proof: WorldIDProof = {
        proof: payload.proof,
        merkle_root: payload.merkle_root,
        nullifier_hash: payload.nullifier_hash,
        verification_level: (payload.verification_level || 'orb') as 'orb' | 'device',
      };

      // Verify with backend
      const backendResult = await verifyWorldID({
        proof,
        walletAddress,
        action: WORLD_ID_ACTION,
        signal: walletAddress,
      });

      if (backendResult.status !== 'success' || !backendResult.data) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: backendResult.error || 'Sunucu dogrulamasi basarisiz',
        }));
        return false;
      }

      // Success! Update state
      setState({
        isAuthenticated: true,
        isLoading: false,
        isVerifying: false,
        user: backendResult.data.user,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({
        ...prev,
        isVerifying: false,
        error: error instanceof Error ? error.message : 'Beklenmeyen bir hata olustu',
      }));
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    clearAuthState();
    setState({
      isAuthenticated: false,
      isLoading: false,
      isVerifying: false,
      user: null,
      error: null,
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
