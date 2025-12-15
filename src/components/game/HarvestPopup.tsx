import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Coins, Gem } from "lucide-react";

interface HarvestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  flowerEmoji?: string;
}

const HarvestPopup = ({ isOpen, onClose, onClaim, flowerEmoji = "🌺" }: HarvestPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-white/80 via-white/60 to-emerald-50/80 backdrop-blur-2xl border border-white/50 shadow-[0_28px_60px_rgba(16,185,129,0.25)] rounded-3xl max-w-xs mx-auto p-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.15),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,0.16),transparent_45%)]" />

        <div className="relative flex flex-col items-center py-8 px-6">
          <div className="flex items-center gap-2 rounded-full bg-white/70 border border-white/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-700 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Harvested
          </div>

          <h2 className="text-2xl font-extrabold text-foreground mt-4 mb-2">Rewards ready</h2>
          <p className="text-sm text-muted-foreground">Your garden is thriving beautifully.</p>

          {/* Flower with sparkles */}
          <div className="relative my-6">
            <div className="absolute inset-0 bg-amber-300/40 rounded-full blur-3xl scale-150" />
            <Sparkles className="absolute -top-3 -left-2 w-6 h-6 text-amber-400 animate-sparkle" />
            <Sparkles className="absolute -bottom-2 -right-3 w-5 h-5 text-emerald-400 animate-sparkle" style={{ animationDelay: "0.4s" }} />
            <Sparkles className="absolute top-1/2 -left-6 w-4 h-4 text-sky-400 animate-sparkle" style={{ animationDelay: "0.8s" }} />
            <div className="relative text-8xl animate-bounce-soft drop-shadow-[0_12px_30px_rgba(251,191,36,0.35)]">
              {flowerEmoji}
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl bg-gradient-to-br from-amber-100/80 to-amber-50/70 border border-amber-200/70 shadow-md p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
                <span>Garden Coins</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xl">
                <div className="w-10 h-10 rounded-full bg-amber-300/40 flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                +20 B&G
              </div>
              <p className="text-[10px] text-amber-700/70">Deposited instantly</p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-cyan-100/80 to-emerald-50/80 border border-cyan-200/70 shadow-md p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-cyan-700 font-semibold">
                <span>Diamonds</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-center gap-2 text-cyan-900 font-extrabold text-xl">
                <div className="w-10 h-10 rounded-full bg-cyan-300/40 flex items-center justify-center">
                  <Gem className="w-6 h-6" />
                </div>
                +10 💎
              </div>
              <p className="text-[10px] text-cyan-700/70">Boost your upgrades</p>
            </div>
          </div>

          <button
            onClick={onClaim}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Claim & celebrate
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestPopup;
