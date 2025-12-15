import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Droplets, Sparkles, Diamond } from "lucide-react";

interface GrowingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onWater: () => void;
  onFertilize: () => void;
  plantEmoji: string;
  timeLeft?: string;
}

const GrowingPopup = ({ 
  isOpen, 
  onClose, 
  onWater, 
  onFertilize, 
  plantEmoji,
  timeLeft 
}: GrowingPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[320px] bg-gradient-to-b from-emerald-900/95 to-green-950/95 border-2 border-emerald-400/30 rounded-3xl p-0 overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/40 rounded-full animate-pulse"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>

        <div className="relative p-6 flex flex-col items-center">
          {/* Plant display with glow */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-2xl animate-pulse" />
            <div className="relative text-7xl animate-bounce" style={{ animationDuration: '3s' }}>
              {plantEmoji}
            </div>
            {/* Growth sparkles */}
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-emerald-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-emerald-100 mb-1">Growing Plant</h2>
          
          {/* Time remaining */}
          {timeLeft && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-emerald-800/50 rounded-full border border-emerald-500/30">
              <span className="text-emerald-300 text-sm">⏱️ Time left:</span>
              <span className="text-emerald-100 font-bold">{timeLeft}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full space-y-3 mt-2">
            {/* Water button */}
            <Button
              onClick={onWater}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <Droplets className="w-6 h-6 mr-2 animate-pulse" />
              Water Plant
              <span className="ml-2 text-blue-200 text-sm">FREE</span>
            </Button>

            {/* Fertilize button */}
            <Button
              onClick={onFertilize}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-6 h-6 mr-2 animate-pulse" />
              Add Fertilizer
              <div className="ml-2 flex items-center gap-1 bg-amber-700/50 px-2 py-0.5 rounded-full">
                <Diamond className="w-4 h-4 text-cyan-300" />
                <span className="text-cyan-200 text-sm font-bold">5</span>
              </div>
            </Button>
          </div>

          {/* Decorative footer */}
          <div className="mt-4 flex items-center gap-2 text-emerald-400/60 text-xs">
            <span>🌱</span>
            <span>Speed up your plant's growth!</span>
            <span>🌱</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrowingPopup;
