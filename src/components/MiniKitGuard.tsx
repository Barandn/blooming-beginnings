/**
 * MiniKit Guard Component
 * Shows a fallback message if the app is not running inside World App
 */

import { useEffect, useState } from 'react';
import { useMiniKit } from '@/lib/minikit/hooks';

interface MiniKitGuardProps {
  children: React.ReactNode;
}

export function MiniKitGuard({ children }: MiniKitGuardProps) {
  const { isAvailable, isInApp, isLoading } = useMiniKit();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Wait for loading to complete before showing warning
    if (!isLoading && !isAvailable) {
      // Give extra time for MiniKit to initialize
      const timer = setTimeout(() => {
        setShowWarning(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAvailable]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Show warning if MiniKit is not available (not in World App)
  if (showWarning && !isAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* World App Logo Placeholder */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            World App Gerekli
          </h1>

          <p className="text-gray-600 mb-6">
            Bu uygulama sadece World App içinden çalışır.
            Lütfen World App'i indirin ve bu uygulamayı oradan açın.
          </p>

          <div className="space-y-3">
            <a
              href="https://worldcoin.org/download"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
            >
              World App'i İndir
            </a>

            <button
              onClick={() => window.location.reload()}
              className="block w-full bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            World App ile güvenli bir şekilde kimliğinizi doğrulayın ve
            ödüller kazanın.
          </p>
        </div>
      </div>
    );
  }

  // MiniKit is available, render children
  return <>{children}</>;
}

/**
 * Hook to check if app should show MiniKit features
 * Use this for conditional rendering of MiniKit-dependent features
 */
export function useMiniKitRequired(): {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const { isAvailable, isLoading } = useMiniKit();

  return {
    isReady: isAvailable,
    isLoading,
    error: !isLoading && !isAvailable ? 'World App gerekli' : null,
  };
}
