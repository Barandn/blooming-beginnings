import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import { useGame } from "@/context/GameContext";
import { BARN_CONFIG } from "@/config/gameConfig";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Coins, Clock, Trophy, RefreshCw } from "lucide-react";

type NavItem = "garden" | "market" | "barn";

const Barn = () => {
  const { state, flipBarnCard, startBarnGame, checkBarnDailyReset } = useGame();
  const [activeNav, setActiveNav] = useState<NavItem>("barn");
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState("");

  const navigate = useNavigate();

  const { barnGame } = state;
  const isGameOver = barnGame.attemptsUsed >= BARN_CONFIG.totalAttempts || barnGame.matchedPairs >= BARN_CONFIG.totalPairs;
  const canPlay = !barnGame.hasPlayedToday || barnGame.lastPlayedDate === "";

  // Check for daily reset on mount
  useEffect(() => {
    checkBarnDailyReset();
  }, [checkBarnDailyReset]);

  // Show result dialog when game ends
  useEffect(() => {
    if (isGameOver && barnGame.hasPlayedToday) {
      const timer = setTimeout(() => setShowResultDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, barnGame.hasPlayedToday]);

  // Calculate time until midnight reset
  useEffect(() => {
    const updateTimeUntilReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilReset(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimeUntilReset();
    const interval = setInterval(updateTimeUntilReset, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "garden") {
      navigate("/");
    } else if (item === "market") {
      navigate("/market");
    }
  };

  const handleCardClick = (cardId: number) => {
    if (barnGame.hasPlayedToday && barnGame.lastPlayedDate !== "") {
      return; // Already played today
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
        {/* Subtle decorative pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-8 text-8xl">🌾</div>
          <div className="absolute bottom-32 right-8 text-8xl">🌾</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader />

        {/* Main Content */}
        <div className="flex flex-col items-center px-4 pt-20 pb-28">
          {/* Title & Stats Card */}
          <div className="w-full max-w-sm mb-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-amber-100">
              {/* Title Row */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-2xl">🐮</span>
                <h1 className="text-lg font-bold text-amber-800">Günlük Eşleştirme</h1>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-amber-50 rounded-lg py-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <RefreshCw className="w-3 h-3 text-amber-600" />
                    <span className="text-xs text-amber-600">Hak</span>
                  </div>
                  <span className="text-sm font-bold text-amber-800">{attemptsRemaining}/{BARN_CONFIG.totalAttempts}</span>
                </div>
                <div className="bg-green-50 rounded-lg py-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Eşleşme</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">{barnGame.matchedPairs}/{BARN_CONFIG.totalPairs}</span>
                </div>
                <div className="bg-yellow-50 rounded-lg py-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <Coins className="w-3 h-3 text-yellow-600" />
                    <span className="text-xs text-yellow-600">Kazanç</span>
                  </div>
                  <span className="text-sm font-bold text-yellow-700">+{barnGame.totalCoinsWon}</span>
                </div>
              </div>

              {/* Reset Timer */}
              <div className="flex items-center justify-center gap-1 mt-3 text-xs text-amber-500">
                <Clock className="w-3 h-3" />
                <span>Yenileme: {timeUntilReset}</span>
              </div>
            </div>
          </div>

          {/* Already Played Today Message */}
          {barnGame.hasPlayedToday && barnGame.lastPlayedDate && (
            <div className="w-full max-w-sm mb-4">
              <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-center">
                <p className="text-sm font-medium text-green-700">
                  Bugün oynadın! Yarın tekrar gel.
                </p>
              </div>
            </div>
          )}

          {/* Start Game Button - Show if haven't started today */}
          {canPlay && !barnGame.lastPlayedDate && (
            <div className="w-full max-w-sm mb-4">
              <button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="text-xl">🎮</span>
                <span className="text-base">Oyunu Başlat</span>
              </button>
            </div>
          )}

          {/* Card Grid */}
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {barnGame.cards.map((card) => {
                const isFlipped = card.isFlipped || card.isMatched;
                const isMatched = card.isMatched;
                const isDisabled = barnGame.hasPlayedToday || !barnGame.lastPlayedDate || barnGame.flippedCards.length >= 2;

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
                    style={{
                      perspective: "1000px",
                    }}
                  >
                    {/* Card Face */}
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

                    {/* Match Glow Effect */}
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
              Her eşleşme = <strong>{BARN_CONFIG.matchReward} B&G Coin</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
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
                ? "Mükemmel!"
                : barnGame.matchedPairs > 0
                  ? "Tebrikler!"
                  : "Yarın Tekrar Dene!"
              }
            </h2>
            <p className="text-amber-700 text-center mb-4">
              {barnGame.matchedPairs}/{BARN_CONFIG.totalPairs} eşleşme buldun!
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

            <p className="text-sm text-amber-600 text-center">
              Yarın gece 00:00'da yeni oyun!
            </p>

            <button
              onClick={() => setShowResultDialog(false)}
              className="mt-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              Tamam
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barn;
