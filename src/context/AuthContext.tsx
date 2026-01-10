/**
 * Authentication Context - Cloud-Based
 * Uses Supabase for session storage, no localStorage
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  getSiweNonce,
  verifySiwe,
  isAuthenticated as checkAuth,
  getStoredUser,
  clearAuthState,
  logout as apiLogout,
} from '@/lib/minikit/api';

// Safe MiniKit check
function safeMiniKitIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

// User type
interface User {
  id: string;
  walletAddress: string;
  verificationLevel: string;
  createdAt: string;
}

// Auth state
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerifying: boolean;
  user: User | null;
  error: string | null;
}

// Auth context
interface AuthContextValue extends AuthState {
  login: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: checkAuth(),
    isLoading: false,
    isVerifying: false,
    user: getStoredUser(),
    error: null,
  });

  // Login with Wallet Auth (SIWE)
  const login = useCallback(async (): Promise<boolean> => {
    console.log('[Auth] login() started');
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      // Check MiniKit
      const miniKitInstalled = safeMiniKitIsInstalled();
      console.log('[Auth] MiniKit installed:', miniKitInstalled);
      
      if (!miniKitInstalled) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Bu uygulama sadece World App icinde calisir',
        }));
        return false;
      }

      // Step 1: Get nonce from backend
      console.log('[Auth] Step 1: Getting nonce...');
      const nonceResult = await getSiweNonce();
      console.log('[Auth] Nonce result:', nonceResult);

      if (nonceResult.status !== 'success' || !nonceResult.data) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: nonceResult.error || 'Nonce alinamadi',
        }));
        return false;
      }

      const { nonce } = nonceResult.data;

      // Step 2: Request Wallet Auth from MiniKit
      console.log('[Auth] Step 2: Requesting wallet auth...');
      const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const walletAuthPayload = {
        nonce,
        requestId: 'login',
        expirationTime: expirationDate,
        statement: 'Blooming Beginnings uygulamasina giris yap',
      };

      const walletAuthResult = await MiniKit.commandsAsync.walletAuth(walletAuthPayload);
      console.log('[Auth] Wallet auth result:', walletAuthResult);
      
      const walletPayload = walletAuthResult.finalPayload as {
        signature?: string;
        error_code?: string;
        message?: string;
        address?: string;
      };

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

      if (!walletPayload.message || !walletPayload.signature || !walletPayload.address) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: 'Imza alinamadi',
        }));
        return false;
      }

      // Step 3: Verify with backend
      console.log('[Auth] Step 3: Verifying signature...');
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

      // Success!
      console.log('[Auth] Login successful!');
      setState({
        isAuthenticated: true,
        isLoading: false,
        isVerifying: false,
        user: backendResult.data.user,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('[Auth] Login error:', error);
      setState(prev => ({
        ...prev,
        isVerifying: false,
        error: error instanceof Error ? error.message : 'Beklenmeyen bir hata olustu',
      }));
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await apiLogout();
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
