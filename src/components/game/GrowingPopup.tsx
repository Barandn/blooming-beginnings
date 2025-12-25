import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Droplets, Sparkles } from "lucide-react";

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
            <span>{plantEmoji}</span>
            <span>Mahsul Bakımı</span>
            <span>{plantEmoji}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-center space-y-2">
            <div className="text-6xl animate-bounce-soft">{plantEmoji}</div>
            <p className="text-muted-foreground">
                {isThirsty ? "Susadım! Yardım et!" : "Güzelce büyüyorum..."}
            </p>
            <p className="text-sm font-medium">
               Kalan Döngü: {cyclesRemaining} / {totalCycles}
            </p>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button
              className="w-full h-14 text-lg gap-2 bg-blue-500 hover:bg-blue-600"
              onClick={onWater}
              disabled={!isThirsty}
            >
              <Droplets className="w-5 h-5" />
              Sula (1 💎)
            </Button>

            <Button
              variant="secondary"
              className="w-full h-14 text-lg gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300"
              onClick={onFertilize}
            >
              <Sparkles className="w-5 h-5 text-amber-600" />
              Gübrele (500 B&G)
            </Button>
            <p className="text-xs text-center text-muted-foreground">
                Büyüme döngüsünü %25 azaltır (Elmas tasarrufu!)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrowingPopup;
