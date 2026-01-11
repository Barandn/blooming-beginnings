import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGame, Card, BoosterType, BOOSTER_INFO } from "@/context/GameContext";
import { cn } from "@/lib/utils";

// Format time as MM:SS:ms
const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
};

// Confetti component for win celebration
const Confetti = () => {
  const confettiPieces = useMemo(() => {
    const colors = ['#fbbf24', '#3b82f6', '#2563eb', '#ef4444', '#8b5cf6', '#ec4899'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: `${8 + Math.random() * 8}px`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

// Booster Shop Popup Component (Pre-game)
const BoosterShopPopup = ({ onClose }: { onClose: () => void }) => {
  const { user, game, purchaseBooster, canPurchaseBooster } = useGame();
  const boosterTypes: BoosterType[] = ['mirror', 'magnet', 'hourglass', 'moves'];
  const [animatingBooster, setAnimatingBooster] = useState<BoosterType | null>(null);

  const handlePurchase = (boosterType: BoosterType) => {
    if (purchaseBooster(boosterType)) {
      setAnimatingBooster(boosterType);
      setTimeout(() => setAnimatingBooster(null), 600);
    }
  };

  const purchasedCount = boosterTypes.filter(b => game.boosters[b].purchased).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup Content */}
      <div className="relative bg-gradient-to-b from-blue-800 to-blue-900 rounded-3xl border-2 border-white/20 shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-colors z-10"
        >
          ×
        </button>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-4xl animate-bounce">🎁</div>
            <h2 className="text-xl font-black text-white tracking-wider drop-shadow-lg">
              BOOSTER SHOP
            </h2>
            <div className="flex items-center justify-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <span className="text-yellow-400 text-lg">🪙</span>
              <span className="text-white font-bold">{user.coins}</span>
            </div>
          </div>

          {/* Booster Grid */}
          <div className="grid grid-cols-2 gap-3">
            {boosterTypes.map((boosterType) => {
              const info = BOOSTER_INFO[boosterType];
              const isPurchased = game.boosters[boosterType].purchased;
              const canPurchase = canPurchaseBooster(boosterType);
              const isAnimating = animatingBooster === boosterType;

              return (
                <button
                  key={boosterType}
                  onClick={() => handlePurchase(boosterType)}
                  disabled={isPurchased || !canPurchase}
                  className={cn(
                    "relative p-3 rounded-2xl border-2 transition-all duration-300",
                    "flex flex-col items-center gap-1",
                    isPurchased
                      ? "bg-green-500/20 border-green-400/50"
                      : canPurchase
                        ? "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-105 active:scale-95"
                        : "bg-white/5 border-white/10 opacity-50",
                    isAnimating && "booster-purchase-anim"
                  )}
                >
                  {/* Purchased Badge */}
                  {isPurchased && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                      ✓
                    </div>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "text-3xl transition-transform duration-300",
                    isAnimating && "animate-bounce"
                  )}>
                    {info.icon}
                  </div>

                  {/* Name */}
                  <div className="text-white font-bold text-sm">{info.name}</div>

                  {/* Description */}
                  <div className="text-blue-200 text-[10px] text-center opacity-80 leading-tight">
                    {info.description}
                  </div>

                  {/* Price */}
                  {!isPurchased && (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full mt-1",
                      canPurchase ? "bg-yellow-500/20" : "bg-red-500/20"
                    )}>
                      <span className="text-yellow-400 text-xs">🪙</span>
                      <span className={cn(
                        "font-bold text-xs",
                        canPurchase ? "text-yellow-400" : "text-red-400"
                      )}>
                        {info.price}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Done Button */}
          <button
            onClick={onClose}
            className={cn(
              "w-full px-6 py-3 font-black text-lg rounded-full shadow-xl",
              "hover:scale-105 active:scale-95 transition-all duration-200",
              purchasedCount > 0
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                : "bg-white/20 text-white border border-white/30"
            )}
          >
            {purchasedCount > 0 ? `✓ ${purchasedCount} Booster Seçildi` : "Kapat"}
          </button>
        </div>
      </div>
    </div>
  );
};

// In-Game Booster Bar Component
const BoosterBar = () => {
  const { game, activateBooster, canUseBooster } = useGame();
  const boosterTypes: BoosterType[] = ['mirror', 'magnet', 'hourglass', 'moves'];

  // Only show if any booster is purchased and not all are used
  const hasAvailableBoosters = boosterTypes.some(b =>
    game.boosters[b].purchased && !game.boosters[b].used
  );

  if (!hasAvailableBoosters) return null;

  return (
    <div className="flex justify-center gap-2 mb-4">
      {boosterTypes.map((boosterType) => {
        const info = BOOSTER_INFO[boosterType];
        const state = game.boosters[boosterType];

        // Don't show if not purchased
        if (!state.purchased) return null;

        const canUse = canUseBooster(boosterType);
        const isUsed = state.used;
        const isActive = game.boosterEffects[`${boosterType}Active` as keyof typeof game.boosterEffects];

        return (
          <button
            key={boosterType}
            onClick={() => activateBooster(boosterType)}
            disabled={!canUse || isUsed}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all duration-300",
              "flex flex-col items-center gap-1 min-w-[60px]",
              isUsed
                ? "bg-gray-500/20 border-gray-400/30 opacity-40"
                : isActive
                  ? "bg-yellow-500/30 border-yellow-400 booster-active-pulse"
                  : canUse
                    ? "bg-white/10 border-white/30 hover:bg-white/20 hover:scale-110 active:scale-95"
                    : "bg-white/5 border-white/10 opacity-50"
            )}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute inset-0 rounded-xl bg-yellow-400/20 animate-pulse" />
            )}

            {/* Icon */}
            <div className={cn(
              "text-2xl relative z-10",
              isActive && "animate-bounce"
            )}>
              {info.icon}
            </div>

            {/* Used badge */}
            {isUsed && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Booster Effect Overlay - Mirror effect
const MirrorEffectOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="text-6xl animate-spin-slow">🪞</div>
      </div>
    </div>
  );
};

// Magnet Effect Overlay
const MagnetEffectOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <div className="absolute inset-0 bg-red-500/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="text-6xl animate-pulse">🧲</div>
      </div>
    </div>
  );
};

// Hourglass Effect Overlay
const HourglassEffectOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden hourglass-overlay">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg animate-bounce shadow-lg">
        +10 saniye!
      </div>
    </div>
  );
};

// Moves Effect Overlay
const MovesEffectOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-2 rounded-full font-bold text-lg animate-bounce shadow-lg">
        -5 hamle!
      </div>
    </div>
  );
};

// Single Card Component
const CardComponent = React.memo(({
  card,
  onClick,
  isDisabled,
  isShaking,
  isMirrorActive,
  isMagnetTarget
}: {
  card: Card;
  onClick: (id: number) => void;
  isDisabled: boolean;
  isShaking: boolean;
  isMirrorActive?: boolean;
  isMagnetTarget?: boolean;
}) => {
  const [showEmoji, setShowEmoji] = useState(false);

  // Trigger emoji pop animation when card is flipped
  useEffect(() => {
    if (card.isFlipped && !card.isMatched) {
      const timer = setTimeout(() => setShowEmoji(true), 150);
      return () => clearTimeout(timer);
    } else if (!card.isFlipped) {
      setShowEmoji(false);
    }
  }, [card.isFlipped, card.isMatched]);

  // Keep emoji visible for matched cards
  useEffect(() => {
    if (card.isMatched) {
      setShowEmoji(true);
    }
  }, [card.isMatched]);

  const handleClick = useCallback(() => {
    if (!isDisabled && !card.isFlipped && !card.isMatched) {
      onClick(card.id);
    }
  }, [card.id, card.isFlipped, card.isMatched, isDisabled, onClick]);

  // Show emoji in mirror mode (semi-transparent peek)
  const showMirrorEmoji = isMirrorActive && !card.isMatched && !card.isFlipped;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "card-container aspect-[3/4]",
        isDisabled && "disabled",
        isShaking && "card-shake",
        isMagnetTarget && "magnet-target"
      )}
    >
      <div
        className={cn(
          "card-inner",
          (card.isFlipped || card.isMatched) && "flipped",
          card.isMatched && "matched",
          showMirrorEmoji && "mirror-peek"
        )}
      >
        {/* Back of Card */}
        <div className={cn(
          "card-face card-back",
          showMirrorEmoji && "mirror-back-fade"
        )}>
          <span className="card-pattern">⚽</span>
          {/* Mirror peek overlay - shows emoji on card back */}
          {showMirrorEmoji && (
            <div className="absolute inset-0 flex items-center justify-center mirror-emoji-overlay">
              <span className="text-3xl opacity-60 drop-shadow-lg">{card.emoji}</span>
            </div>
          )}
        </div>

        {/* Front of Card */}
        <div className="card-face card-front">
          <span
            className={cn(
              "card-emoji",
              showEmoji && !card.isMatched && "emoji-pop",
              card.isMatched && "emoji-matched"
            )}
          >
            {card.emoji}
          </span>
        </div>
      </div>
    </div>
  );
});

CardComponent.displayName = 'CardComponent';

// Start Screen Component
const StartScreen = ({ onStart, onOpenShop, purchasedCount }: { onStart: () => void; onOpenShop: () => void; purchasedCount: number }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 px-4">
    <div className="relative">
      <div className="text-7xl animate-bounce">⚽</div>
      <div className="absolute -top-2 -right-2 text-3xl animate-pulse">✨</div>
    </div>

    <div className="text-center space-y-2">
      <h2 className="text-4xl font-black text-white tracking-wider drop-shadow-lg">
        SİUU GAME
      </h2>
      <p className="text-blue-100 text-center max-w-xs text-sm opacity-90">
        Find all matching pairs to win coins and climb the monthly leaderboard!
      </p>
    </div>

    {/* Booster Shop Button */}
    <button
      onClick={onOpenShop}
      className={cn(
        "px-6 py-3 rounded-full shadow-lg transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold",
        "flex items-center gap-2 border-2 border-white/20"
      )}
    >
      <span className="text-xl">🎁</span>
      <span>Booster Al</span>
      {purchasedCount > 0 && (
        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {purchasedCount}
        </span>
      )}
    </button>

    <button
      onClick={onStart}
      className={cn(
        "start-pulse px-10 py-4 font-black text-xl rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200",
        purchasedCount > 0
          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
          : "bg-white text-blue-700"
      )}
    >
      ⚽ KICK OFF {purchasedCount > 0 && `(${purchasedCount} Booster)`}
    </button>

    <div className="flex gap-6 text-blue-200 text-sm">
      <div className="flex items-center gap-2">
        <span>🎯</span>
        <span>15 Pairs</span>
      </div>
      <div className="flex items-center gap-2">
        <span>🏆</span>
        <span>100 Coins</span>
      </div>
    </div>
  </div>
);

// Win Screen Component
const WinScreen = ({ moves, elapsedTime, onPlayAgain }: { moves: number; elapsedTime: number; onPlayAgain: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in zoom-in duration-500 px-4">
    <Confetti />

    <div className="win-trophy text-8xl">🏆</div>

    <div className="text-center space-y-2">
      <h2 className="text-5xl font-black text-yellow-400 drop-shadow-lg tracking-wide">
        SİUUUU!
      </h2>
      <p className="text-white text-lg opacity-90">You found all pairs!</p>
    </div>

    <div className="flex gap-3 flex-wrap justify-center">
      <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-blue-200 uppercase tracking-wider">Moves</p>
        <p className="text-2xl font-bold text-white">{moves}</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-blue-200 uppercase tracking-wider">Time</p>
        <p className="text-2xl font-bold text-white font-mono">{formatTime(elapsedTime)}</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-blue-200 uppercase tracking-wider">Reward</p>
        <p className="text-2xl font-bold text-yellow-400">+100</p>
      </div>
    </div>

    <button
      onClick={onPlayAgain}
      className="px-10 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-full shadow-xl hover:from-blue-600 hover:to-blue-700 hover:scale-105 active:scale-95 transition-all duration-200"
    >
      🔄 Play Again
    </button>
  </div>
);

// Time Out Screen Component
const TimeOutScreen = ({ moves, matchedPairs, onPlayAgain }: { moves: number; matchedPairs: number; onPlayAgain: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in zoom-in duration-500 px-4">
    <div className="text-8xl animate-pulse">⏰</div>

    <div className="text-center space-y-2">
      <h2 className="text-5xl font-black text-red-400 drop-shadow-lg tracking-wide">
        TIME'S UP!
      </h2>
      <p className="text-white text-lg opacity-90">You ran out of time!</p>
    </div>

    <div className="flex gap-3 flex-wrap justify-center">
      <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-blue-200 uppercase tracking-wider">Moves</p>
        <p className="text-2xl font-bold text-white">{moves}</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-blue-200 uppercase tracking-wider">Matched</p>
        <p className="text-2xl font-bold text-white">{matchedPairs}/15</p>
      </div>
    </div>

    <button
      onClick={onPlayAgain}
      className="px-10 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg rounded-full shadow-xl hover:from-red-600 hover:to-red-700 hover:scale-105 active:scale-95 transition-all duration-200"
    >
      🔄 Try Again
    </button>
  </div>
);

// Main Game Area Component
const GameArea = () => {
  const { game, startGame, flipCard, resetGame } = useGame();
  const [shakingCards, setShakingCards] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBoosterShopPopup, setShowBoosterShopPopup] = useState(false); // Popup state

  // Handle card shake for non-matching pairs
  useEffect(() => {
    if (game.flippedCards.length === 2) {
      const [id1, id2] = game.flippedCards;
      const card1 = game.cards.find(c => c.id === id1);
      const card2 = game.cards.find(c => c.id === id2);

      if (card1 && card2 && card1.emoji !== card2.emoji) {
        // Cards don't match - trigger shake after a delay
        const shakeTimer = setTimeout(() => {
          setShakingCards([id1, id2]);
          // Clear shake after animation
          setTimeout(() => setShakingCards([]), 400);
        }, 600);

        return () => clearTimeout(shakeTimer);
      }
    }
  }, [game.flippedCards, game.cards]);

  // Disable interactions while processing or during certain booster effects
  useEffect(() => {
    if (game.flippedCards.length === 2 || game.boosterEffects.magnetActive) {
      setIsProcessing(true);
      const timer = setTimeout(() => setIsProcessing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [game.flippedCards.length, game.boosterEffects.magnetActive]);

  // Close booster shop popup when game resets
  useEffect(() => {
    if (!game.gameStartedAt && !game.isComplete && !game.isTimeOut) {
      setShowBoosterShopPopup(false);
    }
  }, [game.gameStartedAt, game.isComplete, game.isTimeOut]);

  const handleFlipCard = useCallback((cardId: number) => {
    if (!isProcessing && !game.boosterEffects.mirrorActive) {
      flipCard(cardId);
    }
  }, [flipCard, isProcessing, game.boosterEffects.mirrorActive]);

  const handleOpenShop = useCallback(() => {
    setShowBoosterShopPopup(true);
  }, []);

  const handleCloseShop = useCallback(() => {
    setShowBoosterShopPopup(false);
  }, []);

  const handleStartGame = useCallback(() => {
    setShowBoosterShopPopup(false);
    startGame();
  }, [startGame]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
  }, [resetGame]);

  // Calculate purchased booster count
  const boosterTypes: BoosterType[] = ['mirror', 'magnet', 'hourglass', 'moves'];
  const purchasedCount = boosterTypes.filter(b => game.boosters[b].purchased).length;

  // Show start screen (with booster shop popup option)
  if (!game.gameStartedAt && !game.isComplete && !game.isTimeOut) {
    return (
      <>
        <StartScreen
          onStart={handleStartGame}
          onOpenShop={handleOpenShop}
          purchasedCount={purchasedCount}
        />
        {showBoosterShopPopup && <BoosterShopPopup onClose={handleCloseShop} />}
      </>
    );
  }

  // Show time out screen
  if (game.isTimeOut) {
    return <TimeOutScreen moves={game.moves} matchedPairs={game.matchedPairs} onPlayAgain={handlePlayAgain} />;
  }

  // Show win screen
  if (game.isComplete) {
    return <WinScreen moves={game.moves} elapsedTime={game.elapsedTime} onPlayAgain={handlePlayAgain} />;
  }

  // Get magnet target cards for visual effect
  const magnetTargetIds: number[] = [];
  if (game.boosterEffects.magnetActive) {
    const unmatchedCards = game.cards.filter(c => !c.isMatched);
    const emojiGroups: Record<string, typeof unmatchedCards> = {};
    unmatchedCards.forEach(card => {
      if (!emojiGroups[card.emoji]) {
        emojiGroups[card.emoji] = [];
      }
      emojiGroups[card.emoji].push(card);
    });
    const pairEmoji = Object.keys(emojiGroups).find(emoji => emojiGroups[emoji].length >= 2);
    if (pairEmoji) {
      magnetTargetIds.push(emojiGroups[pairEmoji][0].id, emojiGroups[pairEmoji][1].id);
    }
  }

  // Game board
  return (
    <div className="w-full max-w-md mx-auto px-3 py-4">
      {/* Booster Effect Overlays */}
      {game.boosterEffects.mirrorActive && <MirrorEffectOverlay />}
      {game.boosterEffects.magnetActive && <MagnetEffectOverlay />}
      {game.boosterEffects.hourglassActive && <HourglassEffectOverlay />}
      {game.boosterEffects.movesActive && <MovesEffectOverlay />}

      {/* Score Header */}
      <div className="score-header flex justify-between items-center mb-5 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">👟</span>
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider">Moves</p>
            <p className={cn(
              "text-lg font-bold text-white transition-all duration-300",
              game.boosterEffects.movesActive && "text-purple-400 scale-110"
            )}>{game.moves}</p>
          </div>
        </div>

        <div className="h-10 w-px bg-white/20" />

        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider">Time</p>
            <p className={cn(
              "text-lg font-bold font-mono transition-all duration-300 text-white"
            )}>{formatTime(game.elapsedTime)}</p>
          </div>
        </div>

        <div className="h-10 w-px bg-white/20" />

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-blue-200 uppercase tracking-wider">Matched</p>
            <p className="text-lg font-bold text-white">{game.matchedPairs}/15</p>
          </div>
          <span className="text-xl">🥅</span>
        </div>
      </div>

      {/* Booster Bar */}
      <BoosterBar />

      {/* Progress Bar */}
      <div className="mb-5 bg-black/20 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${(game.matchedPairs / 15) * 100}%` }}
        />
      </div>

      {/* Card Grid */}
      <div className={cn(
        "game-grid",
        game.boosterEffects.mirrorActive && "mirror-grid-effect"
      )}>
        {game.cards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            onClick={handleFlipCard}
            isDisabled={isProcessing || card.isMatched || game.boosterEffects.mirrorActive || game.boosterEffects.magnetActive}
            isShaking={shakingCards.includes(card.id)}
            isMirrorActive={game.boosterEffects.mirrorActive}
            isMagnetTarget={magnetTargetIds.includes(card.id)}
          />
        ))}
      </div>

      {/* Hint */}
      <p className="text-center text-blue-200/60 text-xs mt-4">
        Tap cards to find matching pairs
      </p>
    </div>
  );
};

export default GameArea;
