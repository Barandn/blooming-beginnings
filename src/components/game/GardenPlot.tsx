import { Droplets, Sparkles } from "lucide-react";

type PlotState = "empty" | "growing" | "watering" | "ready";

interface GardenPlotProps {
  state: PlotState;
  timeLeft?: string;
  plantEmoji?: string;
  onClick?: () => void;
}

const GardenPlot = ({ state, timeLeft, plantEmoji = "🌱", onClick }: GardenPlotProps) => {
  const getPlotContent = () => {
    switch (state) {
      case "empty":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full h-full bg-soil rounded-lg flex items-center justify-center">
              <div className="text-4xl opacity-30">🌱</div>
            </div>
            <button 
              onClick={onClick}
              className="absolute -bottom-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold game-shadow-sm hover:scale-105 transition-transform"
            >
              Plant Seed
            </button>
          </div>
        );
      case "growing":
        return (
          <div className="flex flex-col items-center justify-center h-full relative">
            <div className="w-full h-full bg-soil rounded-lg flex items-center justify-center">
              <div className="text-4xl animate-bounce-soft">{plantEmoji}</div>
            </div>
            <div className="absolute -top-2 -right-2 bg-card px-2 py-0.5 rounded-full text-[10px] font-bold text-foreground border border-border">
              {timeLeft}
            </div>
            <button 
              onClick={onClick}
              className="absolute -bottom-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold game-shadow-sm hover:scale-105 transition-transform"
            >
              Plant Seed
            </button>
          </div>
        );
      case "watering":
        return (
          <div className="flex flex-col items-center justify-center h-full relative">
            <div className="w-full h-full bg-soil rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="text-4xl">{plantEmoji}</div>
              <Droplets className="absolute top-2 right-2 w-5 h-5 text-accent animate-water" />
              <Droplets className="absolute top-4 left-3 w-4 h-4 text-accent animate-water" style={{ animationDelay: "0.3s" }} />
            </div>
            <div className="absolute -top-2 -right-2 bg-card px-2 py-0.5 rounded-full text-[10px] font-bold text-foreground border border-border">
              {timeLeft}
            </div>
            <button 
              onClick={onClick}
              className="absolute -bottom-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold game-shadow-sm hover:scale-105 transition-transform flex items-center gap-1"
            >
              <Droplets className="w-3 h-3" />
              Watering
            </button>
          </div>
        );
      case "ready":
        return (
          <div className="flex flex-col items-center justify-center h-full relative">
            <div className="w-full h-full bg-soil rounded-lg flex items-center justify-center glow-harvest">
              <div className="text-5xl animate-bounce-soft">{plantEmoji}</div>
              <Sparkles className="absolute top-1 right-1 w-4 h-4 text-gold" />
              <Sparkles className="absolute bottom-4 left-1 w-3 h-3 text-gold" />
            </div>
            <button 
              onClick={onClick}
              className="absolute -bottom-3 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold game-shadow-sm hover:scale-105 transition-transform"
            >
              Ready to Harvest
            </button>
          </div>
        );
    }
  };

  return (
    <div className="relative w-24 h-24 game-shadow rounded-xl bg-wood p-1">
      {getPlotContent()}
    </div>
  );
};

export default GardenPlot;
