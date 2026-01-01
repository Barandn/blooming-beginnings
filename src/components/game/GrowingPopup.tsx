import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Droplets, Sparkles, Leaf } from "lucide-react";

interface GrowingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onWater: () => void;
  onFertilize: () => void;
  plantEmoji: string;
  timeLeft?: string;
  isThirsty: boolean;
  cyclesRemaining: number;
  totalCycles: number;
}

const GrowingPopup = ({
  isOpen,
  onClose,
  onWater,
  onFertilize,
  plantEmoji,
  isThirsty,
  cyclesRemaining,
  totalCycles
}: GrowingPopupProps) => {
  const [isWatering, setIsWatering] = useState(false);
  const [isFertilizing, setIsFertilizing] = useState(false);

  const handleWater = useCallback(() => {
    setIsWatering(true);
    setTimeout(() => {
      onWater();
      setIsWatering(false);
    }, 500);
  }, [onWater]);

  const handleFertilize = useCallback(() => {
    setIsFertilizing(true);
    setTimeout(() => {
      onFertilize();
      setIsFertilizing(false);
    }, 400);
  }, [onFertilize]);

  const progressPercent = ((totalCycles - cyclesRemaining) / totalCycles) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md animate-popup-enter overflow-hidden ${
        isThirsty
          ? "bg-gradient-to-b from-orange-50 to-red-50 border-red-200"
          : "bg-gradient-to-b from-blue-50 to-green-50 border-green-200"
      }`}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Leaf className={`w-5 h-5 ${isThirsty ? "text-orange-500" : "text-green-500"}`} />
            <span className={isThirsty ? "text-orange-800" : "text-green-800"}>
              Crop Care
            </span>
            <Leaf className={`w-5 h-5 scale-x-[-1] ${isThirsty ? "text-orange-500" : "text-green-500"}`} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-3">
          {/* Crop view */}
          <div className="relative">
            {/* Water droplet animation */}
            {isWatering && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 animate-water">
                  <Droplets className="w-5 h-5 text-blue-400" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-water" style={{ animationDelay: "0.15s" }}>
                  <Droplets className="w-6 h-6 text-blue-500" />
                </div>
                <div className="absolute top-0 right-1/4 animate-water" style={{ animationDelay: "0.3s" }}>
                  <Droplets className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            )}

            {/* Fertilizer sparkle */}
            {isFertilizing && (
              <div className="absolute inset-0 pointer-events-none">
                <Sparkles className="absolute top-0 left-0 w-4 h-4 text-yellow-400 animate-star-burst" />
                <Sparkles className="absolute top-0 right-0 w-4 h-4 text-amber-400 animate-star-burst" style={{ animationDelay: "0.1s" }} />
                <Sparkles className="absolute bottom-0 left-1/4 w-3 h-3 text-yellow-500 animate-star-burst" style={{ animationDelay: "0.2s" }} />
                <Sparkles className="absolute bottom-0 right-1/4 w-3 h-3 text-amber-500 animate-star-burst" style={{ animationDelay: "0.3s" }} />
              </div>
            )}

            <div
              className={`text-7xl transition-all duration-300 ${
                isThirsty ? "animate-thirsty" : "animate-grow"
              } ${isWatering ? "scale-110" : ""} ${isFertilizing ? "animate-sprout" : ""}`}
            >
              {plantEmoji}
            </div>
          </div>

          {/* Status message */}
          <div className="text-center space-y-2">
            <p className={`font-medium ${isThirsty ? "text-red-600 animate-pulse" : "text-green-700"}`}>
              {isThirsty ? "💧 I'm thirsty! Help me!" : "🌱 Growing nicely..."}
            </p>

            {/* Progress bar */}
            <div className="w-48 mx-auto">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Growth</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Remaining: {cyclesRemaining} cycles
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col w-full gap-3">
            <Button
              className={`w-full h-14 text-lg gap-2 touch-feedback transition-all duration-200 ${
                isThirsty
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/30"
                  : "bg-gray-300 cursor-not-allowed"
              } ${isWatering ? "scale-95 opacity-80" : ""}`}
              onClick={handleWater}
              disabled={!isThirsty || isWatering}
            >
              {isWatering ? (
                <span className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 animate-bounce" />
                  Watering...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Droplets className="w-5 h-5" />
                  Water (1 💎)
                </span>
              )}
            </Button>

            <Button
              variant="secondary"
              className={`w-full h-12 text-base gap-2 touch-feedback transition-all duration-200
                bg-gradient-to-r from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200
                text-amber-900 border-2 border-amber-300 shadow-md shadow-amber-100/50
                ${isFertilizing ? "scale-95 opacity-80" : ""}`}
              onClick={handleFertilize}
              disabled={isFertilizing}
            >
              {isFertilizing ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 animate-spin" />
                  Fertilizing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Fertilize (500 B&G)
                </span>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
              <span>✨</span>
              <span>Reduces growth cycle by 25%</span>
              <span>✨</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrowingPopup;
