import { useState } from "react";
import GardenPlot from "@/components/game/GardenPlot";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import GardenBackground from "@/components/game/GardenBackground";
import HarvestPopup from "@/components/game/HarvestPopup";
import { toast } from "@/hooks/use-toast";

type NavItem = "garden" | "market" | "barn";

const Index = () => {
  const [activeNav, setActiveNav] = useState<NavItem>("garden");
  const [coins, setCoins] = useState(1250);
  const [isHarvestOpen, setIsHarvestOpen] = useState(false);
  const [harvestFlower, setHarvestFlower] = useState("🌺");

  const handlePlotClick = (state: string, emoji?: string) => {
    if (state === "ready") {
      setHarvestFlower(emoji || "🌺");
      setIsHarvestOpen(true);
    } else if (state === "empty") {
      toast({
        title: "Planting seed...",
        description: "This feature is coming soon! 🌱",
      });
    } else {
      toast({
        title: "Growing...",
        description: "This feature is coming soon! 🌱",
      });
    }
  };

  const handleClaim = () => {
    setCoins(prev => prev + 20);
    setIsHarvestOpen(false);
    toast({
      title: "Rewards claimed!",
      description: "You received 20 B&G Coins and 10 Diamonds! 💎",
    });
  };

  // 3 groups: Harvesting, Growing, Planting
  const harvestingPlots = [
    { state: "ready" as const, emoji: "🌺" },
    { state: "ready" as const, emoji: "🌻" },
    { state: "ready" as const, emoji: "🌷" },
  ];

  const growingPlots = [
    { state: "flowering" as const, timeLeft: "00:30", isWatering: true, emoji: "🌷" },
    { state: "growing" as const, timeLeft: "02:00", emoji: "🌿" },
    { state: "sprout" as const, timeLeft: "03:30", isWatering: true, emoji: "🌱" },
  ];

  const plantingPlots = [
    { state: "seeded" as const, timeLeft: "04:59", emoji: "🌰" },
    { state: "empty" as const },
    { state: "empty" as const },
  ];

  type PlotData = {
    state: "empty" | "seeded" | "sprout" | "growing" | "flowering" | "ready";
    timeLeft?: string;
    isWatering?: boolean;
    emoji?: string;
  };

  const renderPlotGroup = (title: string, plots: PlotData[], icon: string) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-foreground/80">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {plots.map((plot, index) => (
          <GardenPlot
            key={index}
            state={plot.state}
            timeLeft={plot.timeLeft}
            isWatering={plot.isWatering}
            onClick={() => handlePlotClick(plot.state, plot.emoji)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <GardenBackground />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader coins={coins} />
        
        {/* Garden Groups */}
        <div className="flex flex-col items-center px-4 pt-20 pb-28">
          <div className="w-full max-w-sm space-y-2">
            {renderPlotGroup("Harvesting", harvestingPlots, "✨")}
            {renderPlotGroup("Growing", growingPlots, "🌱")}
            {renderPlotGroup("Planting", plantingPlots, "🌰")}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeItem={activeNav} 
        onItemClick={setActiveNav}
      />

      {/* Harvest Popup */}
      <HarvestPopup
        isOpen={isHarvestOpen}
        onClose={() => setIsHarvestOpen(false)}
        onClaim={handleClaim}
        flowerEmoji={harvestFlower}
      />
    </div>
  );
};

export default Index;
