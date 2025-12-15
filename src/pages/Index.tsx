import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GardenPlot from "@/components/game/GardenPlot";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import GardenBackground from "@/components/game/GardenBackground";
import HarvestPopup from "@/components/game/HarvestPopup";
import GrowingPopup from "@/components/game/GrowingPopup";
import SeedPopup from "@/components/game/SeedPopup";
import { toast } from "@/hooks/use-toast";

type NavItem = "garden" | "market" | "barn";

interface PlotData {
  state: "empty" | "seeded" | "sprout" | "growing" | "flowering" | "ready";
  timeLeft?: string;
  isWatering?: boolean;
  emoji?: string;
}

const Index = () => {
  const [activeNav, setActiveNav] = useState<NavItem>("garden");
  const [coins, setCoins] = useState(1250);
  const [isHarvestOpen, setIsHarvestOpen] = useState(false);
  const [harvestFlower, setHarvestFlower] = useState("🌺");
  const [isGrowingOpen, setIsGrowingOpen] = useState(false);
  const [growingPlant, setGrowingPlant] = useState<PlotData | null>(null);
  const [isSeedOpen, setIsSeedOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "market") {
      navigate("/market");
    } else if (item === "barn") {
      navigate("/barn");
    }
  };

  const handlePlotClick = (state: string, emoji?: string, timeLeft?: string) => {
    if (state === "ready") {
      setHarvestFlower(emoji || "🌺");
      setIsHarvestOpen(true);
    } else if (state === "empty" || state === "seeded") {
      setIsSeedOpen(true);
    } else if (["sprout", "growing", "flowering"].includes(state)) {
      setGrowingPlant({ state: state as PlotData["state"], emoji, timeLeft });
      setIsGrowingOpen(true);
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

  const handleWater = () => {
    setIsGrowingOpen(false);
    toast({
      title: "Plant watered! 💧",
      description: "Your plant is growing faster now!",
    });
  };

  const handleFertilize = () => {
    setIsGrowingOpen(false);
    toast({
      title: "Fertilizer added! ✨",
      description: "5 Diamonds spent. Growth speed doubled!",
    });
  };

  const handleSelectSeed = (seed: { emoji: string; name: string; reward: number }) => {
    setIsSeedOpen(false);
    toast({
      title: `${seed.emoji} ${seed.name} planted!`,
      description: `Will earn ${seed.reward} B&G Coins when harvested!`,
    });
  };

  // Mixed plots for natural look
  const allPlots = [
    { state: "ready" as const, emoji: "🌺" },
    { state: "growing" as const, timeLeft: "02:00", emoji: "🌿" },
    { state: "empty" as const },
    { state: "flowering" as const, timeLeft: "00:30", isWatering: true, emoji: "🌷" },
    { state: "ready" as const, emoji: "🌻" },
    { state: "seeded" as const, timeLeft: "04:59", emoji: "🌰" },
    { state: "sprout" as const, timeLeft: "03:30", isWatering: true, emoji: "🌱" },
    { state: "ready" as const, emoji: "🌷" },
    { state: "empty" as const },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <GardenBackground />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader coins={coins} />
        
        {/* Garden Plots - Natural scattered layout */}
        <div className="flex flex-col items-center px-4 pt-24 pb-28">
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-3 gap-3">
              {allPlots.map((plot, index) => (
                <div 
                  key={index} 
                  className="flex justify-center"
                  style={{ 
                    transform: `translateY(${index % 2 === 0 ? '0px' : '8px'}) rotate(${(index - 4) * 1.5}deg)` 
                  }}
                >
                  <GardenPlot
                    state={plot.state}
                    timeLeft={plot.timeLeft}
                    isWatering={plot.isWatering}
                    onClick={() => handlePlotClick(plot.state, plot.emoji, plot.timeLeft)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeItem={activeNav} 
        onItemClick={handleNavClick}
      />

      {/* Harvest Popup */}
      <HarvestPopup
        isOpen={isHarvestOpen}
        onClose={() => setIsHarvestOpen(false)}
        onClaim={handleClaim}
        flowerEmoji={harvestFlower}
      />

      {/* Growing Popup */}
      {/* Growing Popup */}
      <GrowingPopup
        isOpen={isGrowingOpen}
        onClose={() => setIsGrowingOpen(false)}
        onWater={handleWater}
        onFertilize={handleFertilize}
        plantEmoji={growingPlant?.emoji || "🌱"}
        timeLeft={growingPlant?.timeLeft}
      />

      {/* Seed Selection Popup */}
      <SeedPopup
        isOpen={isSeedOpen}
        onClose={() => setIsSeedOpen(false)}
        onSelectSeed={handleSelectSeed}
      />
    </div>
  );
};

export default Index;
