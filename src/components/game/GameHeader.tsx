import { useGame } from "@/context/GameContext";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";

const GameHeader = () => {
  const { user, barnStatus, refreshBarnStatus } = useGame();
  const { profile } = useProfile();
  const [, setTick] = useState(0);

  // Update timer every minute to show accurate countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
      // Refresh barn status every minute to check for life regeneration
      if (barnStatus.lives < 5) {
        refreshBarnStatus();
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(timer);
  }, [barnStatus.lives, refreshBarnStatus]);

  const formatId = (id: string) => {
    if (!id || id === "guest") return "Guest";
    if (id.length > 12) {
      return id.substring(0, 8) + "...";
    }
    return id;
  };

  // Format token balance for display
  const tokenBalance = profile?.stats?.totalTokensClaimed || "0";

  // Format time until next life
  const formatTimeUntilNextLife = () => {
    if (barnStatus.lives >= 5) return "Full";
    if (!barnStatus.nextLifeInMs || barnStatus.nextLifeInMs <= 0) return "Soon";

    const totalSeconds = Math.floor(barnStatus.nextLifeInMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex items-center justify-between">
        {/* User Identity */}
        <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white/20 shadow-lg">
                <span className="text-xl">⚽</span>
            </div>
            <div className="flex flex-col">
                <span className="text-white font-bold text-sm leading-tight">
                    {formatId(user.id)}
                </span>
                <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                    Rookie League
                </span>
            </div>
        </div>

        {/* Currency Display */}
        <div className="flex items-center gap-2">
          {/* Lives Display */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-600/40 to-pink-600/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-400/30 shadow-lg">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="text-xs"
                    style={{
                      opacity: i < barnStatus.lives ? 1 : 0.3,
                      filter: i < barnStatus.lives ? 'none' : 'grayscale(100%)',
                    }}
                  >
                    ❤️
                  </span>
                ))}
              </div>
            </div>
            {barnStatus.lives < 5 && (
              <span className="text-[10px] text-white/60 font-mono">
                +1 in {formatTimeUntilNextLife()}
              </span>
            )}
          </div>

          {/* Token Balance (Blockchain) */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/40 to-blue-600/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-400/30 shadow-lg">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
                  <span className="text-white font-bold text-[10px]">B</span>
              </div>
              <span className="font-bold text-white text-sm font-mono">
                  {parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
          </div>

          {/* Game Coins (Local) */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-inner">
                  <span className="text-black font-bold text-[10px]">$</span>
              </div>
              <span className="font-bold text-white text-sm font-mono">
                  {user.coins.toLocaleString()}
              </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHeader;
