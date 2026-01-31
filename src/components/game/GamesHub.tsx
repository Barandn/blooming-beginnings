import React, { useState } from "react";
import { cn } from "@/lib/utils";
import GameArea from "./GameArea";
import FootballPenalty from "./FootballPenalty";

type ActiveGame = "hub" | "cards" | "penalty";

interface GameCardProps {
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  onClick: () => void;
  badge?: string;
}

const GameCard = ({ title, subtitle, icon, gradient, onClick, badge }: GameCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "relative w-full aspect-[16/9] rounded-3xl overflow-hidden",
      "transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
      "shadow-xl hover:shadow-2xl",
      gradient
    )}
  >
    {/* Glass overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
    
    {/* Content */}
    <div className="relative z-10 h-full flex flex-col justify-between p-5">
      <div className="flex justify-between items-start">
        <div className="text-left">
          <h3 className="text-2xl font-black text-white drop-shadow-lg tracking-wide">
            {title}
          </h3>
          <p className="text-white/80 text-sm mt-1">{subtitle}</p>
        </div>
        {badge && (
          <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-lg">
            {badge}
          </span>
        )}
      </div>
      
      <div className="flex justify-between items-end">
        <span className="text-6xl filter drop-shadow-lg">{icon}</span>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
          <span className="text-white font-bold text-sm">PLAY NOW</span>
          <span className="text-white">→</span>
        </div>
      </div>
    </div>
    
    {/* Decorative circles */}
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
    <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-white/5 rounded-full" />
  </button>
);

const GamesHub = () => {
  const [activeGame, setActiveGame] = useState<ActiveGame>("hub");

  // Cards Game (existing)
  if (activeGame === "cards") {
    return (
      <div className="relative">
        <button
          onClick={() => setActiveGame("hub")}
          className="absolute top-2 left-4 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
        >
          <span>←</span>
          <span>Games</span>
        </button>
        <GameArea />
      </div>
    );
  }

  // Penalty Game (new)
  if (activeGame === "penalty") {
    return (
      <div className="relative">
        <button
          onClick={() => setActiveGame("hub")}
          className="absolute top-2 left-4 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
        >
          <span>←</span>
          <span>Games</span>
        </button>
        <FootballPenalty />
      </div>
    );
  }

  // Games Hub
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-wider drop-shadow-lg">
          🎮 GAMES
        </h1>
        <p className="text-blue-200/80 text-sm mt-2">
          Choose a game and have fun!
        </p>
      </div>

      {/* Game Cards */}
      <div className="space-y-4">
        {/* Card Matching Game */}
        <GameCard
          title="SIUU GAME"
          subtitle="Match all pairs to win coins"
          icon="⚽"
          gradient="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"
          onClick={() => setActiveGame("cards")}
          badge="100 Coins"
        />

        {/* Penalty Kick Game */}
        <GameCard
          title="PENALTY KICK"
          subtitle="Score goals from 10m to 200m"
          icon="🥅"
          gradient="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700"
          onClick={() => setActiveGame("penalty")}
          badge="NEW"
        />
      </div>

      {/* Footer hint */}
      <p className="text-center text-blue-200/50 text-xs mt-8">
        More games coming soon...
      </p>
    </div>
  );
};

export default GamesHub;
