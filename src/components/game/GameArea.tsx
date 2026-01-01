import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGame, Card } from "@/context/GameContext";
import { cn } from "@/lib/utils";

// Confetti component for win celebration
const Confetti = () => {
  const confettiPieces = useMemo(() => {
    const colors = ['#fbbf24', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];
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

// Single Card Component
const CardComponent = React.memo(({
  card,
  onClick,
  isDisabled,
  isShaking
}: {
  card: Card;
  onClick: (id: number) => void;
  isDisabled: boolean;
  isShaking: boolean;
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

  return (
    <div
      onClick={handleClick}
      className={cn(
        "card-container aspect-[3/4]",
        isDisabled && "disabled",
        isShaking && "card-shake"
      )}
    >
      <div
        className={cn(
          "card-inner",
          (card.isFlipped || card.isMatched) && "flipped",
          card.isMatched && "matched"
        )}
      >
        {/* Back of Card */}
        <div className="card-face card-back">
          <span className="card-pattern">⚽</span>
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
const StartScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-8 px-4">
    <div className="relative">
      <div className="text-7xl animate-bounce">⚽</div>
      <div className="absolute -top-2 -right-2 text-3xl animate-pulse">✨</div>
    </div>

    <div className="text-center space-y-2">
      <h2 className="text-4xl font-black text-white tracking-wider drop-shadow-lg">
        SİUU GAME
      </h2>
      <p className="text-green-100 text-center max-w-xs text-sm opacity-90">
        Find all matching pairs to win coins and climb the monthly leaderboard!
      </p>
    </div>

    <button
      onClick={onStart}
      className="start-pulse px-10 py-4 bg-white text-green-700 font-black text-xl rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200"
    >
      ⚽ KICK OFF
    </button>

    <div className="flex gap-6 text-green-200 text-sm">
      <div className="flex items-center gap-2">
        <span>🎯</span>
        <span>8 Pairs</span>
      </div>
      <div className="flex items-center gap-2">
        <span>🏆</span>
        <span>100 Coins</span>
      </div>
    </div>
  </div>
);

// Win Screen Component
const WinScreen = ({ moves, onPlayAgain }: { moves: number; onPlayAgain: () => void }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in zoom-in duration-500 px-4">
    <Confetti />

    <div className="win-trophy text-8xl">🏆</div>

    <div className="text-center space-y-2">
      <h2 className="text-5xl font-black text-yellow-400 drop-shadow-lg tracking-wide">
        SİUUUU!
      </h2>
      <p className="text-white text-lg opacity-90">You found all pairs!</p>
    </div>

    <div className="flex gap-4">
      <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-green-200 uppercase tracking-wider">Moves</p>
        <p className="text-3xl font-bold text-white">{moves}</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl text-center border border-white/20">
        <p className="text-xs text-green-200 uppercase tracking-wider">Reward</p>
        <p className="text-3xl font-bold text-yellow-400">+100</p>
      </div>
    </div>

    <button
      onClick={onPlayAgain}
      className="px-10 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg rounded-full shadow-xl hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95 transition-all duration-200"
    >
      🔄 Play Again
    </button>
  </div>
);

// Main Game Area Component
const GameArea = () => {
  const { game, startGame, flipCard, resetGame } = useGame();
  const [shakingCards, setShakingCards] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Disable interactions while processing
  useEffect(() => {
    if (game.flippedCards.length === 2) {
      setIsProcessing(true);
      const timer = setTimeout(() => setIsProcessing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [game.flippedCards.length]);

  const handleFlipCard = useCallback((cardId: number) => {
    if (!isProcessing) {
      flipCard(cardId);
    }
  }, [flipCard, isProcessing]);

  // Show start screen
  if (!game.gameStartedAt && !game.isComplete) {
    return <StartScreen onStart={startGame} />;
  }

  // Show win screen
  if (game.isComplete) {
    return <WinScreen moves={game.moves} onPlayAgain={resetGame} />;
  }

  // Game board
  return (
    <div className="w-full max-w-md mx-auto px-3 py-4">
      {/* Score Header */}
      <div className="score-header flex justify-between items-center mb-5 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👟</span>
          <div>
            <p className="text-xs text-green-200 uppercase tracking-wider">Moves</p>
            <p className="text-xl font-bold text-white">{game.moves}</p>
          </div>
        </div>

        <div className="h-10 w-px bg-white/20" />

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-green-200 uppercase tracking-wider">Matched</p>
            <p className="text-xl font-bold text-white">{game.matchedPairs} / 8</p>
          </div>
          <span className="text-2xl">🥅</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5 bg-black/20 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${(game.matchedPairs / 8) * 100}%` }}
        />
      </div>

      {/* Card Grid */}
      <div className="game-grid">
        {game.cards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            onClick={handleFlipCard}
            isDisabled={isProcessing || card.isMatched}
            isShaking={shakingCards.includes(card.id)}
          />
        ))}
      </div>

      {/* Hint */}
      <p className="text-center text-green-200/60 text-xs mt-4">
        Tap cards to find matching pairs
      </p>
    </div>
  );
};

export default GameArea;
