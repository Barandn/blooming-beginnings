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

  const plantEmoji = getPlantEmoji();

  return (
    <div
      className="relative w-24 h-28 cursor-pointer transition-all duration-500 group"
      onClick={onClick}
    >
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/40 via-white/10 to-emerald-50/30 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />

      {/* Plot Image */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/50 shadow-[0_18px_40px_rgba(16,185,129,0.18)] backdrop-blur-sm bg-white/50">
        <img
          src={gardenPlot}
          alt="Garden plot"
          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply"
        />

        {/* Plant Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {state === "empty" ? (
            <div className="text-3xl text-emerald-500/50 font-semibold">+</div>
          ) : (
            <div className={`relative ${getPlantSize()} ${state === "ready" ? "animate-bounce-soft" : "animate-grow"}`}>
              <div className="absolute -inset-2 rounded-full bg-gradient-to-b from-emerald-200/30 via-white/40 to-amber-100/40 blur-lg" />
              <div className="relative filter drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]">
                {plantEmoji}
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-2 bg-emerald-500/10 rounded-full blur-lg animate-ripple" />
            </div>
          )}
        </div>

        {/* Watering Animation */}
        {isWatering && state !== "empty" && state !== "ready" && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 animate-water" style={{ animationDelay: "0s" }}>
              <Droplets className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="absolute top-0 left-1/2 animate-water" style={{ animationDelay: "0.25s" }}>
              <Droplets className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="absolute top-0 right-1/4 animate-water" style={{ animationDelay: "0.5s" }}>
              <Droplets className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-6 h-2 bg-cyan-400/25 rounded-full animate-ripple" />
            </div>
          </div>
        )}

        {/* Ready Sparkles */}
        {state === "ready" && (
          <>
            <Sparkles className="absolute top-4 right-4 w-4 h-4 text-amber-400 animate-sparkle" />
            <Sparkles className="absolute top-8 left-4 w-3 h-3 text-amber-300 animate-sparkle" style={{ animationDelay: "0.5s" }} />
            <Sparkles className="absolute bottom-10 right-6 w-3 h-3 text-amber-400 animate-sparkle" style={{ animationDelay: "1s" }} />
          </>
        )}

        {/* Time Left Badge */}
        {timeLeft && state !== "empty" && state !== "ready" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-white/70 backdrop-blur-md rounded-full text-[10px] font-bold text-emerald-700 border border-emerald-100 shadow-sm whitespace-nowrap">
            {timeLeft}
          </div>
        )}
      </div>
    </div>
  );
};

export default GardenPlot;
