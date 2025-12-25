import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Diamond, Coins } from "lucide-react";
import { useEffect, useState } from "react";

interface HarvestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  flowerEmoji: string;
  seedCost: number; // To calculate reward
}

const HarvestPopup = ({ isOpen, onClose, onClaim, flowerEmoji, seedCost }: HarvestPopupProps) => {
  const [bngReward, setBngReward] = useState(0);
  const diamondReward = seedCost * 2;

  // Simulate the random reward calculation for display purposes
  // Actual reward is calculated in context
  useEffect(() => {
      if (isOpen) {
          setBngReward(Math.floor(seedCost * 3.5)); // Average display
      }
  }, [isOpen, seedCost]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-green-50 to-green-100 border-green-200">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl text-green-800">Hasat Zamanı!</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-200 blur-xl opacity-50 animate-pulse rounded-full" />
            <div className="text-8xl relative animate-bounce-soft">{flowerEmoji}</div>
          </div>
          
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-green-900">Muhteşem Hasat!</h3>
            <p className="text-green-700">Mahsulünle harika ilgilendin.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-white/50 p-4 rounded-xl border border-green-200 flex flex-col items-center gap-2">
              <Diamond className="w-8 h-8 text-cyan-400 fill-cyan-400" />
              <div className="text-center">
                <p className="text-xs font-bold text-green-600 uppercase">Elmas</p>
                <p className="text-2xl font-black text-green-800">+{diamondReward}</p>
              </div>
            </div>

            <div className="bg-white/50 p-4 rounded-xl border border-green-200 flex flex-col items-center gap-2">
              <Coins className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              <div className="text-center">
                <p className="text-xs font-bold text-green-600 uppercase">B&G Coin</p>
                <p className="text-2xl font-black text-green-800">Rastgele</p>
              </div>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 animate-pulse"
            onClick={onClaim}
          >
            Ödülleri Al
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestPopup;
