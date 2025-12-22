import { Diamond, Coins, Trophy } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useState } from "react";
import Leaderboard from "./Leaderboard";

interface GameHeaderProps {
  // Props are now handled by context, keeping interface for compatibility if needed or removing
  coins?: number; // Legacy prop
}

const GameHeader = ({ }: GameHeaderProps) => {
  const { state } = useGame();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Resources */}
          <div className="flex gap-2">
            {/* Diamonds */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-cyan-200 shadow-md">
              <Diamond className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span className="font-bold text-slate-700">{state.diamonds}</span>
            </div>

            {/* Coins (B&G) */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-200 shadow-md">
              <Coins className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-slate-700">{state.bng}</span>
            </div>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-white/90 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center border border-amber-200 shadow-md hover:scale-105 transition-transform"
          >
            <Trophy className="w-5 h-5 text-amber-500" />
          </button>
        </div>
      </div>

      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
};

export default GameHeader;
