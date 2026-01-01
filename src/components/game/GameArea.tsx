import React from "react";
import { useGame, Card } from "@/context/GameContext";
import { cn } from "@/lib/utils";

const CardComponent = ({ card, onClick }: { card: Card; onClick: (id: number) => void }) => {
  return (
    <div
      onClick={() => onClick(card.id)}
      className={cn(
        "relative w-full aspect-[3/4] cursor-pointer perspective-1000 transition-transform duration-300",
        card.isFlipped ? "[transform:rotateY(180deg)]" : "",
        card.isMatched ? "opacity-0 scale-90 delay-500" : "" // Fade out on match? Or keep visible? Let's keep visible but dimmed.
        // Actually, matching games usually keep them visible face up.
      )}
    >
      <div
        className={cn(
          "w-full h-full relative preserve-3d transition-all duration-500",
           card.isFlipped ? "[transform:rotateY(180deg)]" : ""
        )}
      >
        {/* Back of Card (Pattern) */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-600 to-green-800 rounded-xl border-2 border-white/20 shadow-lg flex items-center justify-center">
            <span className="text-2xl opacity-50">⚽</span>
        </div>

        {/* Front of Card (Emoji) */}
        <div className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-white rounded-xl border-2 border-green-500 shadow-xl flex items-center justify-center text-4xl">
          {card.emoji}
        </div>
      </div>
    </div>
  );
};

const GameArea = () => {
  const { game, startGame, flipCard, resetGame } = useGame();

  if (!game.gameStartedAt && !game.isComplete) {
     return (
         <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
             <div className="text-6xl animate-bounce">⚽</div>
             <h2 className="text-3xl font-bold text-white tracking-wider drop-shadow-md">SİUU GAME</h2>
             <p className="text-green-100 text-center max-w-xs">
                 Find all matching pairs to win coins and climb the monthly leaderboard!
             </p>
             <button
                onClick={startGame}
                className="px-8 py-4 bg-white text-green-700 font-black text-xl rounded-full shadow-lg hover:scale-105 transition-transform"
             >
                 KICK OFF
             </button>
         </div>
     )
  }

  if (game.isComplete) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in zoom-in duration-500">
              <div className="text-8xl">🏆</div>
              <h2 className="text-4xl font-bold text-yellow-400 drop-shadow-md">SİUUUU!</h2>
              <p className="text-white text-lg">You found all pairs!</p>
              <div className="bg-white/10 p-4 rounded-xl text-center">
                  <p className="text-sm text-green-200">Moves</p>
                  <p className="text-2xl font-bold text-white">{game.moves}</p>
              </div>
              <button
                 onClick={resetGame}
                 className="px-8 py-3 bg-green-500 text-white font-bold rounded-full shadow-lg hover:bg-green-600 transition-colors"
              >
                  Play Again
              </button>
          </div>
      )
  }

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Score / Moves Header */}
      <div className="flex justify-between items-center mb-6 bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
         <div className="flex items-center space-x-2">
             <span className="text-2xl">👟</span>
             <span className="text-white font-bold">{game.moves} Moves</span>
         </div>
         <div className="flex items-center space-x-2">
             <span className="text-2xl">🥅</span>
             <span className="text-white font-bold">{game.matchedPairs} / 8</span>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-3">
        {game.cards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            onClick={flipCard}
          />
        ))}
      </div>
    </div>
  );
};

export default GameArea;
