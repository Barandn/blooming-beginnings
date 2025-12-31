import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Diamond, Coins, Sparkles } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface HarvestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  flowerEmoji: string;
  seedCost: number;
}

// Konfeti parçacıkları için renk paleti
const confettiColors = [
  "bg-yellow-400",
  "bg-green-400",
  "bg-pink-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-orange-400",
];

const HarvestPopup = ({ isOpen, onClose, onClaim, flowerEmoji, seedCost }: HarvestPopupProps) => {
  const [bngReward, setBngReward] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const diamondReward = seedCost * 2;

  useEffect(() => {
    if (isOpen) {
      setBngReward(Math.floor(seedCost * 3.5));
      setShowConfetti(true);
      setShowRewards(false);

      // Ödülleri kademeli göster
      const timer = setTimeout(() => setShowRewards(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
      setIsClaiming(false);
    }
  }, [isOpen, seedCost]);

  const handleClaim = useCallback(() => {
    setIsClaiming(true);
    // Hasat patlaması animasyonu sonrası
    setTimeout(() => {
      onClaim();
    }, 300);
  }, [onClaim]);

  // Konfeti parçacıkları oluştur
  const renderConfetti = () => {
    if (!showConfetti) return null;

    return (
      <div className="confetti-container">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 360;
          const tx = Math.cos((angle * Math.PI) / 180) * (40 + Math.random() * 30);
          const ty = Math.sin((angle * Math.PI) / 180) * (40 + Math.random() * 30) - 20;

          return (
            <div
              key={i}
              className={`confetti-piece ${confettiColors[i % confettiColors.length]} rounded-full`}
              style={{
                left: "50%",
                top: "30%",
                "--tx": `${tx}px`,
                "--ty": `${ty}px`,
                animationDelay: `${i * 0.05}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-green-50 via-emerald-50 to-green-100 border-green-200 overflow-hidden animate-popup-enter">
        {renderConfetti()}

        <DialogHeader>
          <DialogTitle className="text-center text-2xl text-green-800 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500 animate-sparkle" />
            <span>Harvest Time!</span>
            <Sparkles className="w-6 h-6 text-yellow-500 animate-sparkle" style={{ animationDelay: "0.3s" }} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4 relative">
          {/* Ana mahsul emoji */}
          <div className="relative">
            {/* Parıltı efekti */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200 blur-2xl opacity-60 animate-pulse rounded-full scale-150" />
            <div className="absolute inset-0 golden-shine rounded-full" />

            <div className={`text-8xl relative ${isClaiming ? "animate-harvest-burst" : "animate-bounce-soft"}`}>
              {flowerEmoji}
            </div>

            {/* Yıldız parıltıları */}
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-star-burst" style={{ animationDelay: "0.1s" }} />
            <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-yellow-300 animate-star-burst" style={{ animationDelay: "0.3s" }} />
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-green-900 animate-reward-pop" style={{ animationDelay: "0.1s" }}>
              Amazing Harvest!
            </h3>
            <p className="text-green-700 text-sm">You took great care of your crop 🌟</p>
          </div>

          {/* Ödül kartları */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Elmas ödülü */}
            <div
              className={`bg-white/70 backdrop-blur-sm p-4 rounded-xl border-2 border-cyan-200 flex flex-col items-center gap-2 shadow-lg shadow-cyan-100/50 transition-all duration-300 ${
                showRewards ? "animate-reward-pop" : "opacity-0 scale-75"
              }`}
              style={{ animationDelay: "0.2s" }}
            >
              <div className="relative">
                <Diamond className="w-10 h-10 text-cyan-400 fill-cyan-400 drop-shadow-lg" />
                <div className="absolute inset-0 animate-pulse">
                  <Diamond className="w-10 h-10 text-cyan-300 fill-cyan-300 opacity-50 blur-sm" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Diamonds</p>
                <p className="text-2xl font-black text-cyan-700 tabular-nums">+{diamondReward}</p>
              </div>
            </div>

            {/* B&G Coin ödülü */}
            <div
              className={`bg-white/70 backdrop-blur-sm p-4 rounded-xl border-2 border-yellow-200 flex flex-col items-center gap-2 shadow-lg shadow-yellow-100/50 transition-all duration-300 ${
                showRewards ? "animate-reward-pop" : "opacity-0 scale-75"
              }`}
              style={{ animationDelay: "0.35s" }}
            >
              <div className="relative">
                <Coins className="w-10 h-10 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
                <div className="absolute inset-0 animate-pulse">
                  <Coins className="w-10 h-10 text-yellow-400 fill-yellow-400 opacity-50 blur-sm" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">B&G Coin</p>
                <p className="text-lg font-bold text-yellow-700">Surprise! ✨</p>
              </div>
            </div>
          </div>

          {/* Hasat butonu */}
          <Button
            className={`w-full h-14 text-lg font-bold shadow-lg transition-all duration-200 touch-feedback ${
              isClaiming
                ? "bg-green-400 scale-95"
                : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02]"
            } ${showRewards ? "animate-reward-pop" : "opacity-0"}`}
            style={{ animationDelay: "0.5s" }}
            onClick={handleClaim}
            disabled={isClaiming}
          >
            {isClaiming ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-spin" />
                Collecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🎉</span>
                <span>Claim Rewards</span>
                <span>🎉</span>
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestPopup;
