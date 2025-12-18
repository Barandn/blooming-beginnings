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
      <DialogContent className="sm:max-w-[340px] bg-gradient-to-b from-amber-800/95 to-amber-950/95 border-2 border-amber-400/40 rounded-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700/80 to-orange-700/80 px-6 py-4 border-b border-amber-500/30">
          <h2 className="text-xl font-bold text-amber-100 text-center flex items-center justify-center gap-2">
            <span>🌱</span>
            My Seeds
            <span>🌱</span>
          </h2>
          <p className="text-amber-300/80 text-xs text-center mt-1">Choose a seed to plant</p>
        </div>

        {/* Shelf background with seeds */}
        <ScrollArea className="h-[320px]">
          <div className="p-4 space-y-2">
            {/* Shelf rows */}
            {seeds.map((seed, index) => (
              <div
                key={index}
                className="relative"
              >
                {/* Shelf plank */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-lg shadow-lg"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.4)' }}
                />
                
                {/* Seed item on shelf */}
                <Button
                  onClick={() => onSelectSeed(seed)}
                  variant="ghost"
                  className="w-full h-auto p-3 mb-2 bg-gradient-to-r from-amber-900/60 to-amber-800/40 hover:from-amber-700/70 hover:to-amber-600/50 border border-amber-500/20 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/20 active:scale-95"
                >
                  <div className="flex items-center w-full gap-3">
                    {/* Seed emoji with glow */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md" />
                      <span className="relative text-4xl filter drop-shadow-lg">{seed.emoji}</span>
                    </div>
                    
                    {/* Seed info */}
                    <div className="flex-1 text-left">
                      <h3 className="text-amber-100 font-bold text-sm">{seed.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-amber-400/80 text-xs">Owned:</span>
                        <span className="text-amber-200 font-semibold text-xs">{seed.owned}</span>
                      </div>
                    </div>
                    
                    {/* Reward display */}
                    <div className="flex flex-col items-center bg-gradient-to-br from-yellow-500/30 to-amber-600/30 px-3 py-1.5 rounded-xl border border-yellow-500/30">
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-300 font-bold text-sm">+{seed.reward}</span>
                      </div>
                      <span className="text-yellow-400/70 text-[10px]">B&G Coins</span>
                    </div>
                  </div>
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer decoration */}
        <div className="bg-gradient-to-r from-amber-900/80 to-amber-800/80 px-4 py-3 border-t border-amber-500/20">
          <div className="flex items-center justify-center gap-2 text-amber-400/60 text-xs">
            <span>🏪</span>
            <span>Visit Market for more seeds!</span>
            <span>🏪</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeedPopup;
