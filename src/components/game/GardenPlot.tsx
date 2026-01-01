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
      className="relative w-[88px] h-[88px] cursor-pointer plot-interactive group"
      onClick={onClick}
    >
      {/* Modern Plot Container with glassmorphism */}
      <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
        state === "ready"
          ? "bg-gradient-to-b from-amber-100/40 to-amber-200/30 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          : state === "empty"
          ? "bg-gradient-to-b from-white/10 to-white/5 group-hover:from-white/20 group-hover:to-white/10"
          : "bg-gradient-to-b from-white/15 to-white/10"
      } backdrop-blur-sm border border-white/20`} />

      {/* Plot Image */}
      <img
        src={gardenPlot}
        alt="Field"
        className={`w-full h-full object-contain drop-shadow-md transition-all duration-300 relative z-10 ${
          state === "ready" ? "drop-shadow-[0_4px_12px_rgba(251,191,36,0.4)]" : ""
        }`}
      />

      {/* Plant Container */}
      <div className="absolute inset-0 flex items-center justify-center -mt-1 pointer-events-none z-20">
        {state === "empty" ? (
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
            <span className="text-2xl text-white/60 font-light">+</span>
          </div>
        ) : (
          <div
            className={`${getPlantSize()} ${getPlantAnimation()} transition-all duration-300 drop-shadow-lg`}
            style={{ filter: getFilter() }}
          >
            {plantEmoji}
          </div>
        )}
      </div>

      {/* Ready state glow ring */}
      {state === "ready" && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-1 rounded-2xl border-2 border-yellow-400/40 animate-pulse" />
        </div>
      )}

      {/* Dead State */}
      {state === "dead" && (
        <div className="absolute -top-1 -right-1 z-30 bg-gray-800/80 rounded-full p-1 shadow-lg">
          <Skull className="w-4 h-4 text-gray-300" />
        </div>
      )}

      {/* Thirsty State - modern indicator */}
      {state === "thirsty" && (
        <>
          <div className="absolute inset-0 rounded-2xl border-2 border-red-400/50 animate-pulse pointer-events-none z-0" />
          <div className="absolute -top-1 -right-1 z-30 w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-soft">
            <Droplets className="w-3 h-3 text-white" />
          </div>
        </>
      )}

      {/* Watering Animation */}
      {isWatering && state !== "empty" && state !== "ready" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-30 rounded-2xl">
          <div className="absolute top-0 left-1/4 animate-water" style={{ animationDelay: "0s" }}>
            <Droplets className="w-4 h-4 text-blue-400 drop-shadow-sm" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-water" style={{ animationDelay: "0.15s" }}>
            <Droplets className="w-5 h-5 text-blue-500 drop-shadow-sm" />
          </div>
          <div className="absolute top-0 right-1/4 animate-water" style={{ animationDelay: "0.3s" }}>
            <Droplets className="w-4 h-4 text-blue-400 drop-shadow-sm" />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-2 bg-blue-300/40 rounded-full animate-ripple"
               style={{ animationDelay: "0.4s" }} />
        </div>
      )}

      {/* Ready Sparkles */}
      {state === "ready" && (
        <>
          <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-400 animate-sparkle drop-shadow-md z-30" />
          <Sparkles className="absolute top-6 left-2 w-3 h-3 text-yellow-300 animate-sparkle drop-shadow-md z-30" style={{ animationDelay: "0.4s" }} />
          <Sparkles className="absolute bottom-6 right-4 w-3.5 h-3.5 text-yellow-400 animate-sparkle drop-shadow-md z-30" style={{ animationDelay: "0.8s" }} />
        </>
      )}

      {/* Time Left Badge - modern pill design */}
      {timeLeft && (state === "growing" || state === "thirsty") && (
        <div className={`absolute -top-2 left-1/2 -translate-x-1/2 z-40 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg whitespace-nowrap flex items-center gap-1 backdrop-blur-sm transition-all duration-200 ${
            state === "thirsty"
            ? "bg-gradient-to-r from-red-500/90 to-red-600/90 text-white border border-red-400/30"
            : "bg-gradient-to-r from-emerald-500/90 to-emerald-600/90 text-white border border-emerald-400/30"
        }`}>
          <Clock className="w-3 h-3" />
          <span>{timeLeft}</span>
        </div>
      )}
    </div>
  );
};

export default GardenPlot;
