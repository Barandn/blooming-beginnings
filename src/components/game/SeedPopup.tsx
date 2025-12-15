import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Seed {
  emoji: string;
  name: string;
  owned: number;
  reward: number;
}

interface SeedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeed: (seed: Seed) => void;
}

const seeds: Seed[] = [
  { emoji: "🌺", name: "Hibiscus", owned: 5, reward: 20 },
  { emoji: "🌻", name: "Sunflower", owned: 3, reward: 25 },
  { emoji: "🌷", name: "Tulip", owned: 8, reward: 15 },
  { emoji: "🌹", name: "Rose", owned: 2, reward: 35 },
  { emoji: "🌸", name: "Cherry Blossom", owned: 4, reward: 30 },
  { emoji: "💐", name: "Bouquet", owned: 1, reward: 50 },
  { emoji: "🪻", name: "Hyacinth", owned: 6, reward: 18 },
  { emoji: "🌼", name: "Daisy", owned: 10, reward: 12 },
];

const SeedPopup = ({ isOpen, onClose, onSelectSeed }: SeedPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[360px] bg-gradient-to-br from-white/85 via-amber-50/80 to-emerald-50/85 border border-white/60 rounded-3xl p-0 overflow-hidden shadow-[0_22px_55px_rgba(180,83,9,0.18)]">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-amber-200/80 bg-gradient-to-r from-amber-100/80 via-white/80 to-emerald-50/70 backdrop-blur-sm">
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-amber-200/60 blur-3xl rounded-full" />
          <h2 className="relative text-xl font-extrabold text-amber-900 text-center flex items-center justify-center gap-2">
            <span>🌱</span>
            My Seeds
            <span>🌱</span>
          </h2>
          <p className="relative text-amber-700/80 text-xs text-center mt-1">Select a premium seed to plant.</p>
        </div>

        {/* Shelf background with seeds */}
        <ScrollArea className="h-[340px]">
          <div className="p-4 space-y-3">
            {seeds.map((seed, index) => (
              <Button
                key={index}
                onClick={() => onSelectSeed(seed)}
                variant="ghost"
                className="w-full h-auto p-3 bg-white/75 hover:bg-white/90 border border-amber-100 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_15px_35px_rgba(249,115,22,0.2)] active:scale-95 backdrop-blur-md"
              >
                <div className="flex items-center w-full gap-3">
                  {/* Seed emoji with glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-300/40 rounded-full blur-lg" />
                    <span className="relative text-4xl filter drop-shadow-lg">{seed.emoji}</span>
                  </div>

                  {/* Seed info */}
                  <div className="flex-1 text-left">
                    <h3 className="text-amber-900 font-extrabold text-sm">{seed.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-amber-700/80">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Owned {seed.owned}</span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Fast growth</span>
                    </div>
                  </div>

                  {/* Reward display */}
                  <div className="flex flex-col items-center bg-gradient-to-br from-amber-100 to-yellow-50 px-3 py-2 rounded-xl border border-amber-200 shadow-inner">
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-700 font-extrabold text-sm">+{seed.reward}</span>
                    </div>
                    <span className="text-amber-500/70 text-[10px]">B&G Coins</span>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Footer decoration */}
        <div className="bg-gradient-to-r from-amber-100/80 to-emerald-50/80 px-4 py-3 border-t border-amber-200/60 flex items-center justify-between text-amber-700/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Curated for a modern barn</span>
          </div>
          <div className="flex items-center gap-1 font-semibold">
            <span>🏪</span>
            Visit Market
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeedPopup;
