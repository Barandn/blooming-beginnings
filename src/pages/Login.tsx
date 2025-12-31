/**
 * Login Screen Component - Harvest&Yield
 *
 * World ID Sign-In is deprecated as of September 2025.
 * Using Wallet Auth (SIWE) instead.
 * Reference: https://docs.world.org/world-id/sign-in/deprecation
 *
 * World App Guidelines Compliant:
 * - Mobile-first design
 * - Fast loading (<2-3 seconds)
 * - Minimal, clean UI
 * - Single call-to-action: Wallet Auth
 * - No footer/sidebar
 * - Proper error handling with user feedback
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MiniKit } from '@worldcoin/minikit-js';

const Login = () => {
  const { isAuthenticated, isVerifying, error, login, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleLogin = async () => {
    const success = await login();
    if (success) {
      navigate('/', { replace: true });
    }
  };

  // Check if running inside World App
  const isInWorldApp = MiniKit.isInstalled();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Animated Background - Farm Field Theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-700 via-amber-600 to-yellow-500">
        {/* Sun glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-yellow-300/30 rounded-full blur-3xl" />

        {/* Floating farming elements */}
        <div className="absolute top-16 left-8 text-6xl animate-float opacity-25">
          🌾
        </div>
        <div className="absolute top-32 right-6 text-5xl animate-float opacity-25" style={{ animationDelay: '1s' }}>
          🚜
        </div>
        <div className="absolute bottom-48 left-4 text-4xl animate-float opacity-25" style={{ animationDelay: '2s' }}>
          🌽
        </div>
        <div className="absolute bottom-64 right-10 text-5xl animate-float opacity-25" style={{ animationDelay: '0.5s' }}>
          🥕
        </div>
        <div className="absolute top-1/3 left-1/4 text-3xl animate-float opacity-20" style={{ animationDelay: '1.5s' }}>
          🌻
        </div>
        <div className="absolute top-1/2 right-1/4 text-4xl animate-float opacity-20" style={{ animationDelay: '2.5s' }}>
          🍅
        </div>
        <div className="absolute bottom-32 left-1/3 text-3xl animate-float opacity-20" style={{ animationDelay: '0.8s' }}>
          🥔
        </div>
        <div className="absolute top-24 left-1/2 text-4xl animate-float opacity-20" style={{ animationDelay: '1.8s' }}>
          🌱
        </div>

        {/* Field pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.3) 50%, transparent 51%)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Ground section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-amber-900/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo / App Icon */}
        <div className="mb-8 animate-popup-enter">
          <div className="w-32 h-32 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center shadow-2xl border border-white/30 relative">
            <span className="text-7xl">🌾</span>
            {/* Small tractor badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white/50 shadow-lg">
              <span className="text-xl">🚜</span>
            </div>
          </div>
        </div>

        {/* App Title */}
        <div className="text-center mb-10 animate-popup-enter" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg tracking-wide">
            Harvest<span className="text-yellow-300">&</span>Yield
          </h1>
          <p className="text-white/90 text-lg font-medium">
            Plant Your Seeds, Reap Your Harvest
          </p>
          <p className="text-white/70 text-sm mt-1">
            Manage your digital farm and earn
          </p>
        </div>

        {/* Login Card */}
        <div
          className="w-full max-w-sm bg-white/15 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl animate-popup-enter"
          style={{ animationDelay: '0.2s' }}
        >
          {/* Wallet Auth Info */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              {/* Wallet Icon */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M2 10H22" stroke="currentColor" strokeWidth="2" />
                <circle cx="17" cy="14" r="2" fill="currentColor" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Welcome to the Farm
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Connect your wallet and enjoy farming.
              Secure, fast, one-click login.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl">
              <p className="text-red-100 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Not in World App Warning */}
          {!isInWorldApp && (
            <div className="mb-4 p-3 bg-amber-500/20 border border-amber-400/30 rounded-xl">
              <p className="text-amber-100 text-sm text-center">
                Please open this app from within World App
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isVerifying || !isInWorldApp}
            className={`
              w-full py-4 px-6 rounded-2xl font-semibold text-lg
              transition-all duration-300 transform
              flex items-center justify-center gap-3
              ${isVerifying || !isInWorldApp
                ? 'bg-white/30 text-white/50 cursor-not-allowed'
                : 'bg-white text-amber-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isVerifying ? (
              <>
                <div className="w-5 h-5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                {/* Wallet Connect Icon */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-amber-600"
                >
                  <rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 11H21" stroke="currentColor" strokeWidth="2" />
                  <circle cx="16" cy="15" r="1.5" fill="currentColor" />
                </svg>
                <span>Connect Wallet</span>
              </>
            )}
          </button>

          {/* Security Note */}
          <p className="mt-4 text-white/50 text-xs text-center">
            Secure login with your World App wallet
          </p>
        </div>

        {/* Features Preview - Farming themed */}
        <div
          className="mt-8 flex gap-8 animate-popup-enter"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="text-center">
            <div className="text-3xl mb-1">🌱</div>
            <p className="text-white/80 text-xs font-medium">Plant</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">💧</div>
            <p className="text-white/80 text-xs font-medium">Water</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🌾</div>
            <p className="text-white/80 text-xs font-medium">Harvest</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">💰</div>
            <p className="text-white/80 text-xs font-medium">Earn</p>
          </div>
        </div>

        {/* Farming Stats Teaser */}
        <div
          className="mt-6 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 animate-popup-enter"
          style={{ animationDelay: '0.4s' }}
        >
          <span className="text-sm">🏆</span>
          <p className="text-white/70 text-xs">
            Become the best farmer!
          </p>
        </div>
      </div>

      {/* Bottom field decoration */}
      <div className="relative z-10 h-24 bg-gradient-to-t from-amber-900/70 to-transparent flex items-end justify-center pb-4">
        <div className="flex gap-4 opacity-40">
          <span className="text-2xl">🌾</span>
          <span className="text-2xl">🌾</span>
          <span className="text-2xl">🌽</span>
          <span className="text-2xl">🌾</span>
          <span className="text-2xl">🥕</span>
          <span className="text-2xl">🌾</span>
          <span className="text-2xl">🌾</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
