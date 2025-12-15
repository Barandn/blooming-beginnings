import { Wallet } from "lucide-react";

interface GameHeaderProps {
  coins: number;
  avatarEmoji?: string;
}

const GameHeader = ({ coins, avatarEmoji = "👩‍🌾" }: GameHeaderProps) => {
  return (
    <div className="flex justify-between items-start p-4">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-card border-4 border-card flex items-center justify-center game-shadow">
        <span className="text-3xl">{avatarEmoji}</span>
      </div>

      {/* Coins and Wallet */}
      <div className="flex flex-col gap-2 items-end">
        <div className="bg-card rounded-full px-4 py-2 flex items-center gap-2 game-shadow-sm">
          <span className="text-xl">💰</span>
          <span className="font-bold text-foreground">{coins.toLocaleString()} B&G</span>
        </div>
        <button className="bg-card rounded-full px-4 py-2 flex items-center gap-2 game-shadow-sm hover:scale-105 transition-transform">
          <Wallet className="w-4 h-4 text-foreground" />
          <span className="font-semibold text-sm text-foreground">Connect Wallet</span>
        </button>
      </div>
    </div>
  );
};

export default GameHeader;
