
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
      <DialogContent className="bg-card/95 backdrop-blur-xl border-2 border-gold/30 rounded-3xl max-w-xs mx-auto p-0 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-gold/20 via-transparent to-primary/10 pointer-events-none" />
        
        {/* Content */}
        <div className="relative flex flex-col items-center py-8 px-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-4">Harvest Ready!</h2>
          
          {/* Flower with sparkles */}
          <div className="relative mb-6">
            {/* Glow background */}
            <div className="absolute inset-0 bg-gold/30 rounded-full blur-3xl scale-150" />
            
            {/* Sparkles around */}
            <Sparkles className="absolute -top-4 -left-2 w-6 h-6 text-gold animate-sparkle" />
            <Sparkles className="absolute -top-2 -right-4 w-5 h-5 text-gold animate-sparkle" style={{ animationDelay: "0.3s" }} />
            <Sparkles className="absolute -bottom-2 -left-4 w-5 h-5 text-gold animate-sparkle" style={{ animationDelay: "0.6s" }} />
            <Sparkles className="absolute -bottom-4 right-0 w-6 h-6 text-gold animate-sparkle" style={{ animationDelay: "0.9s" }} />
            <Sparkles className="absolute top-1/2 -right-6 w-4 h-4 text-gold animate-sparkle" style={{ animationDelay: "0.5s" }} />
            <Sparkles className="absolute top-1/2 -left-6 w-4 h-4 text-gold animate-sparkle" style={{ animationDelay: "0.8s" }} />
            
            {/* Main flower */}
            <div className="relative text-8xl animate-bounce-soft">
              {flowerEmoji}
            </div>
          </div>
          
          {/* Rewards */}
          <div className="w-full space-y-3 mb-6">
            <p className="text-center text-sm text-muted-foreground mb-3">Rewards available:</p>
            
            {/* Coins reward */}
            <div className="flex items-center justify-center gap-3 bg-gold/10 rounded-2xl py-3 px-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gold/20 rounded-full">
                <Coins className="w-6 h-6 text-gold" />
              </div>
              <span className="text-lg font-bold text-foreground">B&G Coins</span>
            </div>
            
            {/* Diamond reward */}
            <div className="flex items-center justify-center gap-3 bg-accent/10 rounded-2xl py-3 px-4">
              <div className="flex items-center justify-center w-10 h-10 bg-accent/20 rounded-full">
                <Gem className="w-6 h-6 text-accent" />
              </div>
              <span className="text-lg font-bold text-foreground">Diamonds</span>
            </div>
          </div>
          
          {/* Claim button */}
          <button
            onClick={onClaim}
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Harvest & Claim
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestPopup;
