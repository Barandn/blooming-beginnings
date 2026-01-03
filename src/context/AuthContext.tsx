/**
 * Authentication Context
 * Manages World App Wallet Auth (SIWE) across the app
 *
 * World ID Sign-In is deprecated as of September 2025.
 * Using Wallet Auth (SIWE) instead.
 * Reference: https://docs.world.org/world-id/sign-in/deprecation
 *
 * World App Guidelines Compliant:
 * - Uses Wallet Auth for authentication
 * - Stores session in localStorage
 * - Provides auth state to all components
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  getSiweNonce,
  verifySiwe,
  isAuthenticated as checkAuth,
  getStoredUser,
  clearAuthState,
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

  // Login with Wallet Auth (SIWE)
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

      // Step 1: Get nonce from backend
      const nonceResult = await getSiweNonce();

      if (nonceResult.status !== 'success' || !nonceResult.data) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Nonce alinamadi. Lutfen tekrar deneyin.',
        }));
        return false;
      }

      const { nonce } = nonceResult.data;

      // Step 2: Request Wallet Auth from MiniKit
      const walletAuthPayload = {
        nonce,
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        statement: 'Blooming Beginnings uygulamasina giris yap',
      };

      const walletAuthResult = await MiniKit.commandsAsync.walletAuth(walletAuthPayload);
      const walletPayload = walletAuthResult.finalPayload as { signature?: string; error_code?: string; message?: string; address?: string };

      if (!walletPayload?.signature) {
        const errorMessage = walletPayload?.error_code === 'user_rejected'
          ? 'Giris iptal edildi'
          : 'Cuzdan dogrulamasi basarisiz';

        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: errorMessage,
        }));
        return false;
      }

      // Extract payload from wallet auth
      if (!walletPayload.message || !walletPayload.signature || !walletPayload.address) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Imza alinamadi',
        }));
        return false;
      }

      // Step 3: Verify signature with backend
      const backendResult = await verifySiwe({
        message: walletPayload.message,
        signature: walletPayload.signature,
        address: walletPayload.address,
        nonce,
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
