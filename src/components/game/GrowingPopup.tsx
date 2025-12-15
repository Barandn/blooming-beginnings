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
      <DialogContent className="sm:max-w-[340px] bg-gradient-to-br from-emerald-50/90 via-white/80 to-cyan-50/85 border border-white/60 rounded-3xl p-0 overflow-hidden shadow-[0_25px_60px_rgba(6,148,91,0.25)]">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full animate-float"
              style={{
                left: `${10 + i * 12}%`,
                top: `${15 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-200/50 blur-3xl rounded-full" />
          <div className="absolute -left-16 bottom-0 w-44 h-32 bg-cyan-200/50 blur-3xl rounded-full" />
        </div>

        <div className="relative p-7 flex flex-col items-center">
          {/* Plant display with glow */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-emerald-300/35 rounded-full blur-3xl animate-pulse" />
            <div className="relative text-7xl animate-bounce-slow drop-shadow-[0_15px_35px_rgba(16,185,129,0.35)]">
              {plantEmoji}
            </div>
            {/* Growth sparkles */}
            <Sparkles className="absolute -top-2 -right-3 w-6 h-6 text-emerald-500 animate-sparkle" />
            <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-teal-400 animate-sparkle" style={{ animationDelay: '0.4s' }} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-extrabold text-emerald-900 mb-1">Growth in progress</h2>
          <p className="text-sm text-emerald-700/70 mb-3">Nurture your plant with modern boosts.</p>

          {/* Time remaining */}
          {timeLeft && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-emerald-100 shadow-inner">
              <span className="text-emerald-600 text-sm">⏱️ Time left:</span>
              <span className="text-emerald-900 font-bold">{timeLeft}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full space-y-3 mt-2">
            {/* Water button */}
            <Button
              onClick={onWater}
              className="w-full h-14 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-cyan-400/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <Droplets className="w-6 h-6 mr-2 animate-pulse" />
              Water Plant
              <span className="ml-2 text-blue-100 text-sm">FREE</span>
            </Button>

            {/* Fertilize button */}
            <Button
              onClick={onFertilize}
              className="w-full h-14 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-amber-400/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-6 h-6 mr-2 animate-pulse" />
              Add Fertilizer
              <div className="ml-2 flex items-center gap-1 bg-white/40 px-2 py-0.5 rounded-full text-amber-900">
                <Diamond className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-bold">5</span>
              </div>
            </Button>
          </div>

          {/* Decorative footer */}
          <div className="mt-4 flex items-center gap-2 text-emerald-600/70 text-xs">
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
