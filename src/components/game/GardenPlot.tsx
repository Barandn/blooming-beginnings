import { Droplets, Sparkles } from "lucide-react";
import gardenPlot from "@/assets/garden-plot.png";

type PlotState = "empty" | "seeded" | "sprout" | "growing" | "flowering" | "ready";

interface GardenPlotProps {
  state: PlotState;
  timeLeft?: string;
  isWatering?: boolean;
  onClick?: () => void;
}

const GardenPlot = ({ state, timeLeft, isWatering = false, onClick }: GardenPlotProps) => {
  const getPlantEmoji = () => {
    switch (state) {
      case "empty": return null;
      case "seeded": return "🌰";
      case "sprout": return "🌱";
      case "growing": return "🌿";
      case "flowering": return "🌷";
      case "ready": return "🌺";
      default: return null;
    }
  };

  const getPlantSize = () => {
    switch (state) {
      case "seeded": return "text-2xl";
      case "sprout": return "text-3xl";
      case "growing": return "text-4xl";
      case "flowering": return "text-4xl";
      case "ready": return "text-5xl";
      default: return "text-4xl";
    }
  };

  const getActionButton = () => {
    switch (state) {
      case "empty":
        return (
          <button 
            onClick={onClick}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap z-10"
          >
            Tohum Ek
          </button>
        );
      case "ready":
        return (
          <button 
            onClick={onClick}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap z-10"
          >
            Hasat Et
          </button>
        );
      default:
        return isWatering ? (
          <button 
            onClick={onClick}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap z-10"
          >
            <Droplets className="w-3 h-3" />
            Sula
          </button>
        ) : null;
    }
  };

  const plantEmoji = getPlantEmoji();

  return (
    <div className="relative w-28 h-28 cursor-pointer" onClick={onClick}>
      {/* Plot Image */}
      <img 
        src={gardenPlot} 
        alt="Garden plot" 
        className="w-full h-full object-contain drop-shadow-lg"
      />
      
      {/* Plant Container */}
      <div className="absolute inset-0 flex items-center justify-center -mt-4">
        {state === "empty" ? (
          <div className="text-3xl opacity-30">+</div>
        ) : (
          <div className={`${getPlantSize()} ${state === "ready" ? "animate-bounce-soft" : "animate-grow"}`}>
            {plantEmoji}
          </div>
        )}
      </div>

      {/* Watering Animation */}
      {isWatering && state !== "empty" && state !== "ready" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 animate-water" style={{ animationDelay: "0s" }}>
            <Droplets className="w-4 h-4 text-accent" />
          </div>
          <div className="absolute top-0 left-1/2 animate-water" style={{ animationDelay: "0.3s" }}>
            <Droplets className="w-5 h-5 text-accent" />
          </div>
          <div className="absolute top-0 right-1/4 animate-water" style={{ animationDelay: "0.6s" }}>
            <Droplets className="w-4 h-4 text-accent" />
          </div>
          {/* Ripple effect at bottom */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-6 h-2 bg-accent/30 rounded-full animate-ripple" />
          </div>
        </div>
      )}

      {/* Ready Sparkles */}
      {state === "ready" && (
        <>
          <Sparkles className="absolute top-4 right-4 w-4 h-4 text-gold animate-sparkle" />
          <Sparkles className="absolute top-8 left-4 w-3 h-3 text-gold animate-sparkle" style={{ animationDelay: "0.5s" }} />
          <Sparkles className="absolute bottom-10 right-6 w-3 h-3 text-gold animate-sparkle" style={{ animationDelay: "1s" }} />
        </>
      )}

      {/* Time Left Badge */}
      {timeLeft && state !== "empty" && state !== "ready" && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-foreground border border-border shadow-sm whitespace-nowrap">
          {timeLeft}
        </div>
      )}

      {/* Action Button */}
      {getActionButton()}
    </div>
  );
};

export default GardenPlot;
