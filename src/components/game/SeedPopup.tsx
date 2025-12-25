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
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SeedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlotId: number | null;
}

const SeedPopup = ({ isOpen, onClose, selectedPlotId }: SeedPopupProps) => {
  const { state, plantSeed } = useGame();
  const navigate = useNavigate();

  const handlePlant = (plantId: string) => {
    if (selectedPlotId !== null) {
        plantSeed(selectedPlotId, plantId);
        onClose();
    }
  };

  const inventorySeeds = Object.entries(state.inventory).filter(([_, count]) => count > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#fff9ea] border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-center text-amber-900">Tohum Seç</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] p-2">
            {inventorySeeds.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8">
                    <p className="text-amber-800 text-center">Hiç tohumun yok!</p>
                    <Button onClick={() => navigate("/market")}>Pazara Git</Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {inventorySeeds.map(([plantId, count]) => {
                        const plant = PLANT_TYPES[plantId];
                        return (
                            <Button
                                key={plantId}
                                variant="outline"
                                className="h-auto flex flex-col gap-2 py-4 bg-white border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                                onClick={() => handlePlant(plantId)}
                            >
                                <span className="text-4xl">{plant.emoji}</span>
                                <div className="text-center">
                                    <div className="font-bold text-amber-900">{plant.name}</div>
                                    <div className="text-xs text-amber-700">Stok: {count}</div>
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
