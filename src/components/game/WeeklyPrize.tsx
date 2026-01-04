import React, { useState, useEffect, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";
import { getUserProfile, isAuthenticated } from "@/lib/minikit/api";
import { Loader2 } from "lucide-react";

interface DailyBonusState {
  available: boolean;
  claimedToday: boolean;
  cooldownRemainingMs: number;
  streakCount: number;
  lastClaimDate: string | null;
  isLoading: boolean;
  error: string | null;
}

const WeeklyPrize = () => {
  const { claimDailyBonus } = useGame();
  const [isClaiming, setIsClaiming] = useState(false);
  const [bonusState, setBonusState] = useState<DailyBonusState>({
    available: false,
    claimedToday: false,
    cooldownRemainingMs: 0,
    streakCount: 0,
    lastClaimDate: null,
    isLoading: true,
    error: null,
  });

  // Fetch daily bonus status from DB via API
  useEffect(() => {
    const fetchBonusStatus = async () => {
      if (!isAuthenticated()) {
        setBonusState(prev => ({
          ...prev,
          isLoading: false,
          error: "Giriş yapmanız gerekiyor",
        }));
        return;
      }

      try {
        const response = await getUserProfile();

        if (response.status === 'success' && response.data) {
          const { dailyBonus } = response.data;
          setBonusState({
            available: dailyBonus.available,
            claimedToday: dailyBonus.claimedToday,
            cooldownRemainingMs: dailyBonus.cooldownRemainingMs,
            streakCount: dailyBonus.streakCount || 0,
            lastClaimDate: dailyBonus.lastClaimDate || null,
            isLoading: false,
            error: null,
          });
        } else {
          setBonusState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || "Veri yüklenemedi",
          }));
        }
      } catch (error) {
        console.error('Failed to fetch bonus status:', error);
        setBonusState(prev => ({
          ...prev,
          isLoading: false,
          error: "Bağlantı hatası",
        }));
      }
    };

    fetchBonusStatus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (bonusState.cooldownRemainingMs <= 0) return;

    const interval = setInterval(() => {
      setBonusState(prev => {
        const newCooldown = prev.cooldownRemainingMs - 1000;
        if (newCooldown <= 0) {
          clearInterval(interval);
          return { ...prev, cooldownRemainingMs: 0, available: true };
        }
        return { ...prev, cooldownRemainingMs: newCooldown };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [bonusState.cooldownRemainingMs]);

  const days = [1, 2, 3, 4, 5, 6, 7];
  const currentStreak = bonusState.streakCount;

  // Calculate claim state from DB data
  const { canClaimToday, nextClaimDay } = useMemo(() => {
    // If already claimed today
    if (bonusState.claimedToday) {
      return { canClaimToday: false, nextClaimDay: -1 };
    }

    // If cooldown is active
    if (bonusState.cooldownRemainingMs > 0) {
      return { canClaimToday: false, nextClaimDay: -1 };
    }

    // Can claim - calculate next day based on streak
    if (!bonusState.lastClaimDate) {
      // First time user
      return { canClaimToday: true, nextClaimDay: 1 };
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if last claim was yesterday (streak continues)
    if (bonusState.lastClaimDate === yesterdayStr) {
      const nextDay = (currentStreak % 7) + 1;
      return { canClaimToday: true, nextClaimDay: nextDay };
    }

    // Check if claimed earlier today (shouldn't happen due to claimedToday check)
    if (bonusState.lastClaimDate === today) {
      return { canClaimToday: false, nextClaimDay: -1 };
    }

    // Streak broken, start from day 1
    return { canClaimToday: true, nextClaimDay: 1 };
  }, [bonusState.claimedToday, bonusState.cooldownRemainingMs, bonusState.lastClaimDate, currentStreak]);

  const handleClaim = async () => {
    if (!canClaimToday || isClaiming) return;

    setIsClaiming(true);
    try {
      await claimDailyBonus();
      // Refresh state after claim
      const response = await getUserProfile();
      if (response.status === 'success' && response.data) {
        const { dailyBonus } = response.data;
        setBonusState({
          available: dailyBonus.available,
          claimedToday: dailyBonus.claimedToday,
          cooldownRemainingMs: dailyBonus.cooldownRemainingMs,
          streakCount: dailyBonus.streakCount || 0,
          lastClaimDate: dailyBonus.lastClaimDate || null,
          isLoading: false,
          error: null,
        });
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // Format cooldown time
  const formatCooldown = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (bonusState.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-white/60 mt-4">Yükleniyor...</p>
      </div>
    );
  }

  if (bonusState.error && !isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[70vh]">
        <p className="text-white/60">{bonusState.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 min-h-[70vh]">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Weekly Training</h1>
        <p className="text-blue-100">Login 7 days in a row for the Golden Ball!</p>
      </div>

      {/* Cooldown Display */}
      {bonusState.cooldownRemainingMs > 0 && (
        <div className="mb-4 px-4 py-2 bg-orange-500/20 border border-orange-400/50 rounded-full">
          <span className="text-orange-400 text-sm font-bold">
            ⏰ Sonraki bonus: {formatCooldown(bonusState.cooldownRemainingMs)}
          </span>
        </div>
      )}

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