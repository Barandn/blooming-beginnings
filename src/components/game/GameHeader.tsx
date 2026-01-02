import { useGame } from "@/context/GameContext";
import { useProfile } from "@/hooks/useProfile";

const GameHeader = () => {
  const { user } = useGame();
  const { profile } = useProfile();

  const formatId = (id: string) => {
    if (!id || id === "guest") return "Guest";
    if (id.length > 12) {
      return id.substring(0, 8) + "...";
    }
    return id;
  };

  // Format token balance for display
  const tokenBalance = profile?.stats?.totalTokensClaimed || "0";

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
