import React, { useState, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";

const WeeklyPrize = () => {
  const { user, claimDailyBonus } = useGame();
  const [isClaiming, setIsClaiming] = useState(false);

  const days = [1, 2, 3, 4, 5, 6, 7];
  const currentStreak = user.streakCount || 0;

  // Calculate claim state
  const { canClaimToday, nextClaimDay } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = user.lastLoginDate;

    // Already claimed today
    if (lastLogin === today) {
      return { canClaimToday: false, nextClaimDay: -1 };
    }

    // Can claim today - calculate which day
    if (!lastLogin) {
      // First time user
      return { canClaimToday: true, nextClaimDay: 1 };
    }

    // Check if yesterday was the last login (streak continues)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastLogin === yesterdayStr) {
      // Streak continues, next day is currentStreak + 1 (or 1 if was 7)
      const nextDay = (currentStreak % 7) + 1;
      return { canClaimToday: true, nextClaimDay: nextDay };
    }

    // Streak broken, start from day 1
    return { canClaimToday: true, nextClaimDay: 1 };
  }, [user.lastLoginDate, currentStreak]);

  const handleClaim = async () => {
    if (!canClaimToday || isClaiming) return;

    setIsClaiming(true);
    try {
      await claimDailyBonus();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 min-h-[70vh]">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Weekly Training</h1>
        <p className="text-blue-100">Login 7 days in a row for the Golden Ball!</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {days.map((day) => {
          const isCompleted = day <= currentStreak;
          const isClaimable = canClaimToday && day === nextClaimDay;
          const isFinal = day === 7;

          return (
            <div
              key={day}
              className={cn(
                "relative flex items-center p-4 rounded-xl border-2 transition-all",
                isCompleted
                  ? "bg-blue-500/20 border-blue-400"
                  : isClaimable
                    ? "bg-green-500/20 border-green-400"
                    : "bg-black/20 border-white/10",
                isFinal && !isCompleted && !isClaimable && "border-yellow-400 bg-yellow-400/10"
              )}
            >
              {/* Checkmark or Number */}
              <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mr-3",
                  isCompleted ? "bg-blue-500 text-white" : "bg-white/10 text-white/50",
                  isClaimable && "bg-green-500/30 text-green-400",
                  isFinal && !isCompleted && !isClaimable && "bg-yellow-400/20 text-yellow-400"
              )}>
                  {isCompleted ? "✓" : day}
              </div>

              {/* Reward Info */}
              <div className="flex-1">
                  <h3 className={cn("font-bold", isCompleted || isClaimable ? "text-white" : "text-white/50")}>
                      {isFinal ? "Golden Ball" : `Day ${day}`}
                  </h3>
                  <div className="flex items-center text-sm space-x-1">
                      <span>{isFinal ? "1000" : "100"}</span>
                      <span className="text-xs">Coins</span>
                  </div>
              </div>

              {/* Claim Button */}
              <button
                onClick={isClaimable ? handleClaim : undefined}
                disabled={!isClaimable || isClaiming}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all mr-2",
                  isCompleted
                    ? "bg-gray-500/30 text-gray-400 cursor-not-allowed"
                    : isClaimable
                      ? isClaiming
                        ? "bg-green-600/50 text-green-200 cursor-wait"
                        : "bg-green-500 text-white hover:bg-green-600 active:scale-95"
                      : "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                )}
              >
                {isCompleted ? "Claimed" : isClaimable ? (isClaiming ? "..." : "Claim") : "Locked"}
              </button>

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
