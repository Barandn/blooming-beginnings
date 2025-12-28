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
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/30 shadow-lg smooth-hover">
              <div className="w-5 h-5 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-inner">
                <Diamond className="w-3 h-3 text-white fill-white" />
              </div>
              <span className="font-bold text-slate-700 text-sm">{state.diamonds}</span>
            </div>

            {/* Coins (B&G) */}
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/30 shadow-lg smooth-hover">
              <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-inner">
                <Coins className="w-3 h-3 text-white fill-white" />
              </div>
              <span className="font-bold text-slate-700 text-sm">{state.bng}</span>
            </div>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-white/80 backdrop-blur-md rounded-2xl w-11 h-11 flex items-center justify-center border border-white/30 shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-inner">
              <Trophy className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      </div>

      <Leaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
};

export default GameHeader;
