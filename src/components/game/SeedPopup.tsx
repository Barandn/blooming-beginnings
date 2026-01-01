import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/context/GameContext";
import { PLANT_TYPES } from "@/config/gameConfig";
import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";

interface SeedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlotId: number | null;
}

const SeedPopup = ({ isOpen, onClose, selectedPlotId }: SeedPopupProps) => {
  const { state, plantSeed } = useGame();
  const navigate = useNavigate();
  const [plantingId, setPlantingId] = useState<string | null>(null);

  const handlePlant = (plantId: string) => {
    if (selectedPlotId !== null) {
      setPlantingId(plantId);

      // Planting process after short animation
      setTimeout(() => {
        plantSeed(selectedPlotId, plantId);
        setPlantingId(null);
        onClose();
      }, 400);
    }
  };

  const inventorySeeds = Object.entries(state.inventory).filter(([_, count]) => count > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-amber-50 to-orange-50 border-amber-200 animate-popup-enter">
        <DialogHeader>
          <DialogTitle className="text-center text-amber-900 flex items-center justify-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            <span>Select Seed</span>
            <Leaf className="w-5 h-5 text-green-600 scale-x-[-1]" />
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] p-2">
          {inventorySeeds.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 animate-popup-enter">
              <div className="text-5xl animate-wiggle">🌱</div>
              <p className="text-amber-800 text-center font-medium">You have no seeds!</p>
              <Button
                onClick={() => navigate("/market")}
                className="touch-feedback bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                Go to Market
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {inventorySeeds.map(([plantId, count], index) => {
                const plant = PLANT_TYPES[plantId];
                const isPlanting = plantingId === plantId;

                return (
                  <Button
                    key={plantId}
                    variant="outline"
                    disabled={isPlanting}
                    className={`h-auto flex flex-col gap-2 py-4 bg-white border-amber-200
                      hover:bg-amber-50 hover:border-amber-400 hover:shadow-md
                      touch-feedback transition-all duration-200
                      ${isPlanting ? "scale-90 opacity-50" : ""}
                    `}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                    onClick={() => handlePlant(plantId)}
                  >
                    <span
                      className={`text-4xl transition-transform duration-300 ${
                        isPlanting ? "animate-seed-plant" : "hover:scale-110"
                      }`}
                    >
                      {plant.emoji}
                    </span>
                    <div className="text-center">
                      <div className="font-bold text-amber-900">{plant.name}</div>
                      <div className="text-xs text-amber-600 font-medium">
                        Stock: <span className="text-amber-800">{count}</span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SeedPopup;
