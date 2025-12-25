import { Droplets, Sparkles, Skull, Clock } from "lucide-react";
import gardenPlot from "@/assets/garden-plot.png";
import { PlotState } from "@/context/GameContext";
import { PlantType } from "@/config/gameConfig";

interface GardenPlotProps {
  state: PlotState;
  plantType?: PlantType;
  growthProgress?: number;
  timeLeft?: string;
  isWatering?: boolean;
  isNewlyPlanted?: boolean;
  onClick?: () => void;
}

const GardenPlot = ({
  state,
  plantType,
  timeLeft,
  isWatering = false,
  isNewlyPlanted = false,
  onClick
}: GardenPlotProps) => {
  const getPlantEmoji = () => {
    if (!plantType) return null;
    return plantType.emoji;
  };

  const getPlantSize = () => {
    switch (state) {
      case "growing": return "text-4xl";
      case "thirsty": return "text-4xl";
      case "dead": return "text-3xl";
      case "ready": return "text-5xl";
      default: return "text-4xl";
    }
  };

  const getPlantAnimation = () => {
    if (isNewlyPlanted) return "animate-seed-plant";
    switch (state) {
      case "ready": return "animate-bounce-soft";
      case "thirsty": return "animate-thirsty";
      case "growing": return "animate-grow";
      default: return "";
    }
  };

  const getFilter = () => {
    if (state === "dead") return "grayscale(100%) brightness(50%)";
    return "none";
  };

  const plantEmoji = getPlantEmoji();

  return (
    <div
      className="relative w-24 h-24 cursor-pointer plot-interactive"
      onClick={onClick}
    >
      {/* Plot Image with subtle shadow */}
      <img
        src={gardenPlot}
        alt="Tarla"
        className={`w-full h-full object-contain drop-shadow-lg transition-all duration-200 ${
          state === "ready" ? "drop-shadow-[0_0_8px_rgba(255,200,0,0.5)]" : ""
        }`}
      />

      {/* Plant Container */}
      <div className="absolute inset-0 flex items-center justify-center -mt-2 pointer-events-none">
        {state === "empty" ? (
          <div className="text-3xl opacity-30 transition-transform duration-200 group-hover:scale-110">
            <span className="inline-block hover:animate-wiggle">+</span>
          </div>
        ) : (
          <div
            className={`${getPlantSize()} ${getPlantAnimation()} transition-all duration-300`}
            style={{ filter: getFilter() }}
          >
            {plantEmoji}
          </div>
        )}
      </div>

      {/* Ready state glow effect */}
      {state === "ready" && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-2 rounded-full bg-yellow-300/20 animate-pulse" />
        </div>
      )}

      {/* Dead State */}
      {state === "dead" && (
        <div className="absolute top-0 right-0 animate-wiggle">
          <Skull className="w-5 h-5 text-gray-500 drop-shadow-sm" />
        </div>
      )}

      {/* Thirsty State - improved visual */}
      {state === "thirsty" && (
        <>
          <div className="absolute inset-1 border-2 border-red-400 rounded-full animate-pulse pointer-events-none opacity-60" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-bounce-soft">
            <Droplets className="w-2.5 h-2.5 text-white" />
          </div>
        </>
      )}

      {/* Watering Animation - improved with splash effect */}
      {isWatering && state !== "empty" && state !== "ready" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Water drops */}
          <div className="absolute top-0 left-1/4 animate-water" style={{ animationDelay: "0s" }}>
            <Droplets className="w-4 h-4 text-blue-400 drop-shadow-sm" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-water" style={{ animationDelay: "0.15s" }}>
            <Droplets className="w-5 h-5 text-blue-500 drop-shadow-sm" />
          </div>
          <div className="absolute top-0 right-1/4 animate-water" style={{ animationDelay: "0.3s" }}>
            <Droplets className="w-4 h-4 text-blue-400 drop-shadow-sm" />
          </div>

          {/* Splash ripple at bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-2 bg-blue-300/40 rounded-full animate-ripple"
               style={{ animationDelay: "0.4s" }} />
        </div>
      )}

      {/* Ready Sparkles - improved with more dynamic positioning */}
      {state === "ready" && (
        <>
          <Sparkles
            className="absolute top-3 right-3 w-4 h-4 text-yellow-400 animate-sparkle drop-shadow-sm"
          />
          <Sparkles
            className="absolute top-7 left-3 w-3 h-3 text-yellow-300 animate-sparkle drop-shadow-sm"
            style={{ animationDelay: "0.4s" }}
          />
          <Sparkles
            className="absolute bottom-8 right-5 w-3.5 h-3.5 text-yellow-400 animate-sparkle drop-shadow-sm"
            style={{ animationDelay: "0.8s" }}
          />
          <Sparkles
            className="absolute top-5 left-1/2 w-2.5 h-2.5 text-yellow-200 animate-sparkle drop-shadow-sm"
            style={{ animationDelay: "1.2s" }}
          />
        </>
      )}

      {/* Time Left Badge - improved styling */}
      {timeLeft && (state === "growing" || state === "thirsty") && (
        <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold border shadow-md whitespace-nowrap flex items-center gap-1 transition-all duration-200 ${
            state === "thirsty"
            ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 animate-pulse"
            : "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700"
        }`}>
          <Clock className="w-2.5 h-2.5" />
          <span>{timeLeft}</span>
        </div>
      )}
    </div>
  );
};

export default GardenPlot;
