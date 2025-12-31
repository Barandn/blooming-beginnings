/**
 * Login Screen Component
 *
 * World App Guidelines Compliant:
 * - Mobile-first design
 * - Fast loading (<2-3 seconds)
 * - Minimal, clean UI
 * - Single call-to-action: World ID verification
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
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 via-emerald-600 to-green-500">
        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 text-6xl animate-float opacity-20">
          🌻
        </div>
        <div className="absolute top-40 right-8 text-5xl animate-float opacity-20" style={{ animationDelay: '1s' }}>
          🌸
        </div>
        <div className="absolute bottom-40 left-6 text-4xl animate-float opacity-20" style={{ animationDelay: '2s' }}>
          🌷
        </div>
        <div className="absolute bottom-60 right-12 text-5xl animate-float opacity-20" style={{ animationDelay: '0.5s' }}>
          🌺
        </div>
        <div className="absolute top-1/3 left-1/4 text-3xl animate-float opacity-15" style={{ animationDelay: '1.5s' }}>
          🌼
        </div>

        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo / App Icon */}
        <div className="mb-8 animate-popup-enter">
          <div className="w-28 h-28 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center shadow-2xl border border-white/30">
            <span className="text-6xl">🌱</span>
          </div>
        </div>

        {/* App Title */}
        <div className="text-center mb-12 animate-popup-enter" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
            Blooming Beginnings
          </h1>
          <p className="text-white/80 text-lg">
            Dijital bahceni yetistir
          </p>
        </div>

        {/* Login Card */}
        <div
          className="w-full max-w-sm bg-white/15 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl animate-popup-enter"
          style={{ animationDelay: '0.2s' }}
        >
          {/* World ID Info */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              World ID ile Giris Yap
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Insan oldugunu dogrula ve oyuna basla.
              Tek bir hesap, guvende bir kimlik.
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
                Bu uygulamayi World App icinden acin
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
                : 'bg-white text-emerald-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isVerifying ? (
              <>
                <div className="w-5 h-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                <span>Dogrulanıyor...</span>
              </>
            ) : (
              <>
                {/* World ID Icon */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-emerald-600"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
                <span>World ID ile Baglan</span>
              </>
            )}
          </button>

          {/* Security Note */}
          <p className="mt-4 text-white/50 text-xs text-center">
            Orb ile dogrulanmis hesaplar kabul edilir
          </p>
        </div>

        {/* Features Preview */}
        <div
          className="mt-8 flex gap-6 animate-popup-enter"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="text-center">
            <div className="text-3xl mb-1">🌻</div>
            <p className="text-white/70 text-xs">Yetistir</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">💰</div>
            <p className="text-white/70 text-xs">Kazan</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">🏆</div>
            <p className="text-white/70 text-xs">Yarıs</p>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="relative z-10 h-20 bg-gradient-to-t from-green-900/50 to-transparent" />
    </div>
  );
};

export default Login;
