import { Coins } from "lucide-react";
import { useGame } from "@/context/GameContext";

const GameHeader = () => {
  const { user } = useGame();

  const formatId = (id: string) => {
    if (!id || id === "guest") return "Guest";
    if (id.length > 12) {
      return id.substring(0, 8) + "...";
    }
    return id;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex items-center justify-between">
        {/* User Identity */}
        <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center border-2 border-white/20 shadow-lg">
                <span className="text-xl">⚽</span>
            </div>
            <div className="flex flex-col">
                <span className="text-white font-bold text-sm leading-tight">
                    {formatId(user.id)}
                </span>
                <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                    Rookie League
                </span>
            </div>
        </div>

        {/* Coins (Single Currency) */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center shadow-inner">
                <span className="text-black font-bold text-xs">$</span>
            </div>
            <span className="font-bold text-white text-lg font-mono">
                {user.coins.toLocaleString()}
            </span>
        </div>
      </div>
    </div>
  );
};

export default GameHeader;
