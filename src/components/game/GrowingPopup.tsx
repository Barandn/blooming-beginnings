
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Droplets, Sparkles, Diamond, Trash2 } from "lucide-react";
import { ECONOMY } from "@/data/gameData";

interface GrowingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onWater: () => void;
  onFertilize: () => void;
  onClear?: () => void;
  plantEmoji: string;
  timeLeft?: string;
  isDead?: boolean;
}

const GrowingPopup = ({ 
  isOpen, 
  onClose, 
  onWater, 
  onFertilize,
  onClear,
  plantEmoji,
  timeLeft,
  isDead = false
}: GrowingPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[320px] rounded-3xl p-0 overflow-hidden border-2 ${isDead ? 'bg-gray-900 border-gray-600' : 'bg-gradient-to-b from-emerald-900/95 to-green-950/95 border-emerald-400/30'}`}>
        {/* Animated background particles - Only if alive */}
        {!isDead && (
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
        )}

        <div className="relative p-6 flex flex-col items-center">
          {/* Plant display with glow */}
          <div className="relative mb-4">
            {!isDead && <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-2xl animate-pulse" />}
            <div className={`relative text-7xl ${isDead ? 'grayscale' : 'animate-bounce'}`} style={{ animationDuration: '3s' }}>
              {plantEmoji}
            </div>
            {/* Growth sparkles - Only if alive */}
            {!isDead && (
              <>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-emerald-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </>
            )}
          </div>

          {/* Title */}
          <h2 className={`text-xl font-bold mb-1 ${isDead ? 'text-gray-400' : 'text-emerald-100'}`}>
            {isDead ? "Plant Withered" : "Growing Plant"}
          </h2>
          
          {/* Time remaining - Only if alive */}
          {timeLeft && !isDead && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-emerald-800/50 rounded-full border border-emerald-500/30">
              <span className="text-emerald-300 text-sm">⏱️ Time left:</span>
              <span className="text-emerald-100 font-bold">{timeLeft}</span>
            </div>
          )}

          {/* Dead Message */}
          {isDead && (
             <div className="text-center mb-6 text-gray-400 text-sm px-4">
               This plant has withered because it wasn't watered in time. Clear it to get a seed refund.
             </div>
          )}

          {/* Action buttons */}
          <div className="w-full space-y-3 mt-2">
            {!isDead ? (
              <>
                {/* Water button */}
                <Button
                  onClick={onWater}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <Droplets className="w-6 h-6 mr-2 animate-pulse" />
                  Water
                  <div className="ml-2 flex items-center gap-1 bg-blue-700/50 px-2 py-0.5 rounded-full">
                     <Diamond className="w-4 h-4 text-cyan-100" />
                     <span className="text-cyan-100 text-sm font-bold">{ECONOMY.WATER_COST}</span>
                  </div>
                </Button>

                {/* Fertilize button */}
                <Button
                  onClick={onFertilize}
                  className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <Sparkles className="w-6 h-6 mr-2 animate-pulse" />
                  Fertilize
                  <div className="ml-2 flex items-center gap-1 bg-amber-700/50 px-2 py-0.5 rounded-full">
                    <span className="text-sm">🪙</span>
                    <span className="text-cyan-100 text-sm font-bold">{ECONOMY.FERTILIZER_COST}</span>
                  </div>
                </Button>
              </>
            ) : (
                <Button
                  onClick={onClear}
                  className="w-full h-14 bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-gray-500"
                >
                  <Trash2 className="w-6 h-6 mr-2" />
                  Clear & Refund Seed
                </Button>
            )}
          </div>

          {/* Decorative footer */}
          {!isDead && (
            <div className="mt-4 flex items-center gap-2 text-emerald-400/60 text-xs">
              <span>🌱</span>
              <span>Speed up your plant's growth!</span>
              <span>🌱</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrowingPopup;
