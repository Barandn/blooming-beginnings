import { Droplets, Sparkles, Skull, Clock } from "lucide-react";
import gardenPlot from "@/assets/garden-plot.png";
import { PlotState } from "@/context/GameContext";
import { PlantType } from "@/config/gameConfig";

interface GardenPlotProps {
  state: PlotState;
  plantType?: PlantType;
  growthProgress?: number; // 0 to 1
  timeLeft?: string;
  isWatering?: boolean;
  onClick?: () => void;
}

const GardenPlot = ({ state, plantType, timeLeft, isWatering = false, onClick }: GardenPlotProps) => {
  const getPlantEmoji = () => {
    if (!plantType) return null;
    const emoji = plantType.emoji;

    switch (state) {
      case "empty": return null;
      case "growing": return emoji; // Could be smaller/seedling depending on logic, keeping simple for now or scaling
      case "thirsty": return emoji;
      case "dead": return emoji;
      case "ready": return emoji;
      default: return null;
    }
  };

  const getPlantSize = () => {
    switch (state) {
      case "growing": return "text-4xl";
      case "thirsty": return "text-4xl";
      case "dead": return "text-4xl";
      case "ready": return "text-5xl";
      default: return "text-4xl";
    }
  };

  const getFilter = () => {
      if (state === "dead") return "grayscale(100%) brightness(50%)";
      return "none";
  }

  const plantEmoji = getPlantEmoji();

  return (
    <div className="relative w-24 h-24 cursor-pointer hover:scale-105 active:scale-95 transition-transform" onClick={onClick}>
      {/* Plot Image */}
      <img 
        src={gardenPlot} 
        alt="Garden plot" 
        className="w-full h-full object-contain drop-shadow-lg"
      />
      
      {/* Plant Container */}
      <div className="absolute inset-0 flex items-center justify-center -mt-2 pointer-events-none">
        {state === "empty" ? (
          <div className="text-3xl opacity-30">+</div>
        ) : (
          <div
            className={`${getPlantSize()} ${state === "ready" ? "animate-bounce-soft" : ""}`}
            style={{ filter: getFilter() }}
          >
            {plantEmoji}
          </div>
        )}
      </div>

      {/* Dead State */}
      {state === "dead" && (
        <div className="absolute top-0 right-0">
             <Skull className="w-5 h-5 text-gray-500" />
        </div>
      )}

      {/* Thirsty State */}
      {state === "thirsty" && (
        <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-pulse pointer-events-none" />
      )}

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

      {/* Time Left Badge - Logic for Healthy or Thirsty */}
      {timeLeft && (state === "growing" || state === "thirsty") && (
        <div className={`absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-bold border shadow-sm whitespace-nowrap flex items-center gap-1 ${
            state === "thirsty"
            ? "bg-red-500 text-white border-red-700 animate-pulse"
            : "bg-green-500/90 text-white border-green-700"
        }`}>
            <Clock className="w-2 h-2" />
            {timeLeft}
        </div>
      )}
    </div>
  );
};

export default GardenPlot;
