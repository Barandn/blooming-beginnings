import { Wallet } from "lucide-react";

interface GameHeaderProps {
  coins: number;
  avatarEmoji?: string;
}

const GameHeader = ({ coins, avatarEmoji = "👩‍🌾" }: GameHeaderProps) => {
  return (
    <div className="flex justify-between items-start px-5 pt-5">
      {/* Avatar */}
      <div className="relative">
        <div className="absolute -left-3 -bottom-3 w-16 h-16 bg-primary/20 blur-2xl rounded-full" />
        <div className="w-16 h-16 rounded-2xl bg-white/80 border border-white/60 shadow-[0_15px_40px_rgba(16,185,129,0.18)] flex items-center justify-center backdrop-blur-md">
          <span className="text-3xl drop-shadow-sm">{avatarEmoji}</span>
        </div>
      </div>

      {/* Coins and Wallet */}
      <div className="flex flex-col gap-2 items-end">
        <div className="px-4 py-2 rounded-2xl bg-white/75 backdrop-blur-md border border-white/50 shadow-inner flex items-center gap-2 text-sm text-emerald-800">
          <span className="text-xl">💰</span>
          <span className="font-extrabold">{coins.toLocaleString()} B&G</span>
        </div>
        <button className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-transform">
          <Wallet className="w-4 h-4" />
          <span>Connect Wallet</span>
        </button>
      </div>
    </div>
  );
};

export default GameHeader;
