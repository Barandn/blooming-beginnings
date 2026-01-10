import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Loader2 } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";

// Inline safe check to avoid module load issues
function safeMiniKitIsInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

const Login = () => {
  const { login, isVerifying, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    clearError();
    console.log('[Login] Connect Wallet clicked, calling login()...');
    const result = await login();
    console.log('[Login] login() returned:', result);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Background gradient circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Logo / Brand */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-4xl">⚽</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              SİUU Game
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Match. Win. Earn.
            </p>
          </div>
        </div>

        {/* Connect Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">Welcome</h2>
            <p className="text-gray-400 text-sm">
              Connect your wallet to get started
            </p>
          </div>

          {/* World App Notice */}
          {!safeMiniKitIsInstalled() && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
              <p className="text-yellow-300 text-xs">
                Open in World App for the best experience
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Connect Button */}
          <Button
            onClick={handleConnectWallet}
            disabled={isVerifying || isLoading}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </span>
            ) : isVerifying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Connect with Wallet
              </span>
            )}
          </Button>

          {/* Footer text */}
          <p className="text-xs text-center text-gray-500">
            Powered by World App
          </p>
        </div>

        {/* Bottom info */}
        <p className="text-xs text-center text-gray-600">
          By connecting, you agree to the terms of service
        </p>
      </div>
    </div>
  );
};

export default Login;
