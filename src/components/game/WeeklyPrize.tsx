import React, { useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";

const WeeklyPrize = () => {
  const { user, claimDailyBonus } = useGame();

  // Attempt to claim on mount (logic handles if already claimed)
  useEffect(() => {
      claimDailyBonus();
  }, [claimDailyBonus]);

  const days = [1, 2, 3, 4, 5, 6, 7];
  const currentStreak = user.streakCount || 0;

  // Logic:
  // If streak is 0, next is 1.
  // If streak is 3 (claimed today), we show 3 checked.
  // If streak is 3 (claimed yesterday), we show 3 checked and 4 is next?
  // Actually, standard UI shows "Day 1, Day 2..." and highlights the one you are ON.
  // We can just show 1..7. The ones <= currentStreak are "completed" or "active".

  return (
    <div className="flex flex-col items-center p-6 min-h-[70vh]">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Weekly Training</h1>
        <p className="text-blue-100">Login 7 days in a row for the Golden Ball!</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {days.map((day) => {
          const isCompleted = day <= currentStreak;
          const isToday = day === currentStreak; // Simplified view: current streak includes today if claimed.
          const isFinal = day === 7;

          return (
            <div
              key={day}
              className={cn(
                "relative flex items-center p-4 rounded-xl border-2 transition-all",
                isCompleted
                  ? "bg-blue-500/20 border-blue-400"
                  : "bg-black/20 border-white/10",
                isFinal && "border-yellow-400 bg-yellow-400/10"
              )}
            >
              {/* Checkmark or Number */}
              <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mr-4",
                  isCompleted ? "bg-blue-500 text-white" : "bg-white/10 text-white/50",
                  isFinal && !isCompleted && "bg-yellow-400/20 text-yellow-400"
              )}>
                  {isCompleted ? "✓" : day}
              </div>

              {/* Reward Info */}
              <div className="flex-1">
                  <h3 className={cn("font-bold", isCompleted ? "text-white" : "text-white/50")}>
                      {isFinal ? "Golden Ball" : `Day ${day}`}
                  </h3>
                  <div className="flex items-center text-sm space-x-1">
                      <span>{isFinal ? "1000" : "100"}</span>
                      <span className="text-xs">Coins</span>
                  </div>
              </div>

              {/* Icon */}
              <div className="text-2xl">
                  {isFinal ? "🏆" : "💰"}
              </div>

              {/* Progress Line connector (visual only) */}
              {day !== 7 && (
                  <div className="absolute left-[2.4rem] top-14 w-0.5 h-6 bg-white/10 -z-10" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-white/5 rounded-lg text-center max-w-xs">
          <p className="text-sm text-white/60">
              Current Streak: <span className="text-white font-bold">{currentStreak} Days</span>
          </p>
          <p className="text-xs text-white/40 mt-1">
              Miss a day and your training resets!
          </p>
      </div>
    </div>
  );
};

export default WeeklyPrize;
