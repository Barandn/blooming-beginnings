import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import { useGame } from "@/context/GameContext";
import { BARN_CONFIG } from "@/config/gameConfig";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Coins, Clock, Trophy, RefreshCw, Zap, Loader2 } from "lucide-react";
import { useBarnGamePurchase } from "@/lib/minikit/hooks";
import { toast } from "@/hooks/use-toast";

type NavItem = "garden" | "market" | "barn";

// Format milliseconds to HH:MM:SS
const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const Barn = () => {
  const { state, flipBarnCard, startBarnGame, checkBarnDailyReset, resetBarnAttempts, getCooldownRemaining } = useGame();
  const [activeNav, setActiveNav] = useState<NavItem>("barn");
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [cooldownDisplay, setCooldownDisplay] = useState("");

  const navigate = useNavigate();

  const { barnGame } = state;
  const isGameOver = barnGame.attemptsUsed >= BARN_CONFIG.totalAttempts || barnGame.matchedPairs >= BARN_CONFIG.totalPairs;
  const isInCooldown = barnGame.isInCooldown;
  const canPlay = !isInCooldown && (!barnGame.hasPlayedToday || barnGame.lastPlayedDate === "");

  // Handle purchase success
  const handlePurchaseSuccess = useCallback(() => {
    resetBarnAttempts();
    setShowPurchaseDialog(false);
    toast({
      title: "Purchase Successful!",
      description: "10 new matching attempts activated.",
    });
  }, [resetBarnAttempts]);

  // Purchase hook
  const { isPurchasing, error: purchaseError, purchaseWithWLD, purchaseWithUSDC } = useBarnGamePurchase(handlePurchaseSuccess);

  // Check for cooldown reset on mount and periodically
  useEffect(() => {
    checkBarnDailyReset();
    const interval = setInterval(checkBarnDailyReset, 1000);
    return () => clearInterval(interval);
  }, [checkBarnDailyReset]);

  // Update cooldown display
  useEffect(() => {
    if (!isInCooldown) {
      setCooldownDisplay("");
      return;
    }

    const updateCooldown = () => {
      const remaining = getCooldownRemaining();
      setCooldownDisplay(formatCountdown(remaining));
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [isInCooldown, getCooldownRemaining]);

  // Show result dialog when game ends
  useEffect(() => {
    if (isGameOver && barnGame.hasPlayedToday && !isInCooldown) {
      const timer = setTimeout(() => setShowResultDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, barnGame.hasPlayedToday, isInCooldown]);

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "garden") {
      navigate("/");
    } else if (item === "market") {
      navigate("/market");
    }
  };

  const handleCardClick = (cardId: number) => {
    if (isInCooldown) return;
    if (barnGame.hasPlayedToday && barnGame.lastPlayedDate !== "") {
      return;
    }
    if (!barnGame.lastPlayedDate) {
      startBarnGame();
    }
    flipBarnCard(cardId);
  };

  const handleStartGame = () => {
    if (canPlay) {
      startBarnGame();
    }
  };

  const attemptsRemaining = BARN_CONFIG.totalAttempts - barnGame.attemptsUsed;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background - Barn themed gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-8 text-8xl">🌾</div>
          <div className="absolute bottom-32 right-8 text-8xl">🌾</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <GameHeader />

        <div className="flex flex-col items-center px-4 pt-20 pb-28">
          {/* Title & Stats Card */}
          <div className="w-full max-w-sm mb-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-amber-100">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-2xl">🐮</span>
                <h1 className="text-lg font-bold text-amber-800">Daily Matching</h1>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-amber-50 rounded-lg py-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <RefreshCw className="w-3 h-3 text-amber-600" />
                    <span className="text-xs text-amber-600">Attempts</span>
                  </div>
                  <span className="text-sm font-bold text-amber-800">{attemptsRemaining}/{BARN_CONFIG.totalAttempts}</span>
                </div>
                <div className="bg-green-50 rounded-lg py-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Matches</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">{barnGame.matchedPairs}/{BARN_CONFIG.totalPairs}</span>
                </div>
                <div className="bg-yellow-50 rounded-lg py-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <Coins className="w-3 h-3 text-yellow-600" />
                    <span className="text-xs text-yellow-600">Earnings</span>
                  </div>
                  <span className="text-sm font-bold text-yellow-700">+{barnGame.totalCoinsWon}</span>
                </div>
              </div>

              {/* Cooldown Timer - Show when in cooldown */}
              {isInCooldown && cooldownDisplay && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-600">
                      Refresh: {cooldownDisplay}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cooldown Active - Show purchase option */}
          {isInCooldown && (
            <div className="w-full max-w-sm mb-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <div className="text-center mb-3">
                  <p className="text-sm font-medium text-purple-800">
                    Out of attempts! Wait 24 hours or refresh now.
                  </p>
                </div>
                <button
                  onClick={() => setShowPurchaseDialog(true)}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  <span>Refresh Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Start Game Button */}
          {canPlay && !barnGame.lastPlayedDate && (
            <div className="w-full max-w-sm mb-4">
              <button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="text-xl">🎮</span>
                <span className="text-base">Start Game</span>
              </button>
            </div>
          )}

          {/* Card Grid */}
          <div className="w-full max-w-sm">
            <div className={`grid grid-cols-4 gap-2 sm:gap-3 ${isInCooldown ? 'opacity-50 pointer-events-none' : ''}`}>
              {barnGame.cards.map((card) => {
                const isFlipped = card.isFlipped || card.isMatched;
                const isMatched = card.isMatched;
                const isDisabled = isInCooldown || barnGame.hasPlayedToday || !barnGame.lastPlayedDate || barnGame.flippedCards.length >= 2;

                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={isDisabled && !isFlipped}
                    className={`
                      relative aspect-square rounded-xl transition-all duration-300 transform-gpu
                      ${isMatched
                        ? "bg-gradient-to-br from-green-200 to-emerald-300 border-2 border-green-400 shadow-lg scale-95"
                        : isFlipped
                          ? "bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-amber-400 shadow-md"
                          : "bg-gradient-to-br from-amber-600 to-orange-700 border-2 border-amber-800 shadow-lg hover:scale-105 active:scale-95"
                      }
                      ${!isFlipped && !isDisabled ? "cursor-pointer" : ""}
                      barn-card-flip
                    `}
                    style={{ perspective: "1000px" }}
                  >
                    <div
                      className={`
                        absolute inset-0 flex items-center justify-center rounded-xl
                        transition-all duration-500 backface-hidden
                        ${isFlipped ? "barn-card-front" : "barn-card-back"}
                      `}
                    >
                      {isFlipped ? (
                        <span className={`text-3xl sm:text-4xl ${isMatched ? "animate-bounce-soft" : "animate-reward-pop"}`}>
                          {card.emoji}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-2xl sm:text-3xl">❓</span>
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-amber-900/30 to-transparent" />
                        </div>
                      )}
                    </div>

                    {isMatched && (
                      <div className="absolute inset-0 rounded-xl bg-green-400/20 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reward Info */}
          <div className="w-full max-w-sm mt-3">
            <p className="text-center text-xs text-amber-600">
              Each match = <strong>{BARN_CONFIG.matchReward} B&G Coin</strong>
            </p>
          </div>
        </div>
      </div>

      <BottomNavigation activeItem={activeNav} onItemClick={handleNavClick} />

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="bg-gradient-to-b from-amber-50 to-orange-100 border-amber-300 rounded-3xl max-w-sm mx-auto">
          <div className="flex flex-col items-center py-4">
            <div className="text-6xl mb-4 animate-bounce-soft">
              {barnGame.matchedPairs >= BARN_CONFIG.totalPairs ? "🏆" : barnGame.matchedPairs > 0 ? "🎉" : "😢"}
            </div>
            <h2 className="text-2xl font-bold text-amber-800 mb-2">
              {barnGame.matchedPairs >= BARN_CONFIG.totalPairs
                ? "Perfect!"
                : barnGame.matchedPairs > 0
                  ? "Congratulations!"
                  : "Try Again Tomorrow!"}
            </h2>
            <p className="text-amber-700 text-center mb-4">
              You found {barnGame.matchedPairs}/{BARN_CONFIG.totalPairs} matches!
            </p>

            <div className="bg-white/80 rounded-2xl p-4 w-full mb-4">
              <div className="flex items-center justify-center gap-3">
                <Coins className="w-8 h-8 text-yellow-500" />
                <span className="text-3xl font-bold text-amber-800">
                  +{barnGame.totalCoinsWon}
                </span>
                <span className="text-lg text-amber-600">B&G Coin</span>
              </div>
            </div>

            {/* Cooldown info */}
            <div className="bg-purple-50 rounded-xl p-3 w-full mb-4 border border-purple-200">
              <p className="text-sm text-purple-700 text-center">
                Play again in 24 hours or{" "}
                <button
                  onClick={() => {
                    setShowResultDialog(false);
                    setShowPurchaseDialog(true);
                  }}
                  className="font-bold text-purple-600 underline"
                >
                  refresh now
                </button>
              </p>
            </div>

            <button
              onClick={() => setShowResultDialog(false)}
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              OK
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="bg-gradient-to-b from-purple-50 to-indigo-100 border-purple-300 rounded-3xl max-w-sm mx-auto">
          <div className="flex flex-col items-center py-4">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-xl font-bold text-purple-800 mb-2">
              Refresh Attempts
            </h2>
            <p className="text-purple-600 text-center mb-4 text-sm">
              Buy 10 matching attempts and keep playing now!
            </p>

            {purchaseError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 w-full">
                <p className="text-sm text-red-600 text-center">{purchaseError}</p>
              </div>
            )}

            <div className="w-full space-y-3 mb-4">
              {/* WLD Option */}
              <button
                onClick={purchaseWithWLD}
                disabled={isPurchasing}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌐</span>
                  <div className="text-left">
                    <p className="font-bold">Pay with WLD</p>
                    <p className="text-xs opacity-80">World Token</p>
                  </div>
                </div>
                <div className="text-right">
                  {isPurchasing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="font-bold">{BARN_CONFIG.purchase.priceWLD} WLD</span>
                  )}
                </div>
              </button>

              {/* USDC Option */}
              <button
                onClick={purchaseWithUSDC}
                disabled={isPurchasing}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div className="text-left">
                    <p className="font-bold">Pay with USDC</p>
                    <p className="text-xs opacity-80">USD Coin</p>
                  </div>
                </div>
                <div className="text-right">
                  {isPurchasing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="font-bold">${BARN_CONFIG.purchase.priceUSDC}</span>
                  )}
                </div>
              </button>
            </div>

            <p className="text-xs text-purple-500 text-center mb-3">
              Payment is securely processed via World App.
            </p>

            <button
              onClick={() => setShowPurchaseDialog(false)}
              disabled={isPurchasing}
              className="text-purple-600 font-medium py-2 px-6 hover:underline"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barn;
