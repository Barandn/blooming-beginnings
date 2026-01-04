import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Trophy } from "lucide-react";
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
  const { login, isVerifying, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    await login();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-800 via-blue-900 to-black relative overflow-hidden">
      {/* Background Elements (Pitch Lines) */}
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
         <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
         <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20"></div>
         <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"></div>
         <div className="absolute top-1/2 left-1/2 w-64 h-64 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4 animate-bounce">⚽</div>
          <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-tighter uppercase italic">
            SİUU <span className="text-blue-400">GAME</span>
          </h1>
          <p className="text-white/80 text-lg font-medium tracking-wide">
            Match. Win. Conquer.
          </p>
        </div>

        <Card className="bg-black/40 backdrop-blur-md border-white/10 p-8 shadow-2xl space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg border-4 border-black/50">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold text-white">Join the League</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Connect your wallet to compete in the monthly SİUU leaderboard.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {!safeMiniKitIsInstalled() && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center mb-4">
                <p className="text-yellow-200 text-xs">
                  For best experience, open in World App
                </p>
              </div>
            )}

            <Button
              onClick={handleConnectWallet}
              disabled={isVerifying}
              className="w-full h-14 text-lg font-bold bg-white text-blue-900 hover:bg-blue-50 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {isVerifying ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  KICK OFF
                </span>
              )}
            </Button>

            <p className="text-xs text-center text-white/30">
              Secure login with World App
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
