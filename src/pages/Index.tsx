
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GardenPlot from "@/components/game/GardenPlot";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import GardenBackground from "@/components/game/GardenBackground";
import HarvestPopup from "@/components/game/HarvestPopup";
import GrowingPopup from "@/components/game/GrowingPopup";
import SeedPopup from "@/components/game/SeedPopup";
import { useGame } from "@/context/GameContext";
import { FLOWER_TYPES } from "@/data/gameData";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

type NavItem = "garden" | "market" | "barn";

interface PlotData {
  id: string;
  state: "empty" | "seeded" | "sprout" | "growing" | "flowering" | "ready" | "withered";
  timeLeft?: string;
  isWatering?: boolean;
  emoji?: string;
  isDead?: boolean;
}

const Index = () => {
  const { state: gameState, plantSeed, waterPlant, fertilizePlant, harvestPlant, clearDeadPlant, watchAd } = useGame();
  const [activeNav, setActiveNav] = useState<NavItem>("garden");

  // UI State for popups
  const [isHarvestOpen, setIsHarvestOpen] = useState(false);
  const [harvestPlotId, setHarvestPlotId] = useState<string | null>(null);
  const [harvestFlower, setHarvestFlower] = useState("🌺");

  const [isGrowingOpen, setIsGrowingOpen] = useState(false);
  const [growingPlotId, setGrowingPlotId] = useState<string | null>(null);

  const [isSeedOpen, setIsSeedOpen] = useState(false);
  const [seedPlotId, setSeedPlotId] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "market") {
      navigate("/market");
    } else if (item === "barn") {
      navigate("/barn");
    }
  };

  const getPlotDisplayData = (plot: any): PlotData => {
    if (!plot.plant) {
        return { id: plot.id, state: "empty" };
    }
    const plant = plot.plant;
    const species = FLOWER_TYPES.find(s => s.id === plant.speciesId);
    const emoji = species?.icon || "🌱";

    if (plant.isDead) {
        return { id: plot.id, state: "withered", emoji, isDead: true };
    }

    if (plant.isHarvestable) {
        return { id: plot.id, state: "ready", emoji };
    }

    // Progress logic
    const progress = plant.waterCount / plant.totalCyclesNeeded;
    let visualState: PlotData["state"] = "seeded";
    if (progress > 0 && progress < 0.33) visualState = "sprout";
    else if (progress >= 0.33 && progress < 0.66) visualState = "growing";
    else if (progress >= 0.66) visualState = "flowering";

    // Time logic
    const now = Date.now();
    const timeSinceWatered = (now - plant.lastWateredAt) / (1000 * 60 * 60);
    const healthyLimit = species!.wateringInterval;
    const remainingHealthy = Math.max(0, healthyLimit - timeSinceWatered);
    const hours = Math.floor(remainingHealthy);
    const minutes = Math.floor((remainingHealthy - hours) * 60);
    const timeLeft = `${hours}h ${minutes}m`;

    return { id: plot.id, state: visualState, emoji, timeLeft, isDead: false };
  };

  const handlePlotClick = (displayData: PlotData) => {
    if (displayData.state === "ready") {
      setHarvestFlower(displayData.emoji || "🌺");
      setHarvestPlotId(displayData.id);
      setIsHarvestOpen(true);
    } else if (displayData.state === "empty") {
      setSeedPlotId(displayData.id);
      setIsSeedOpen(true);
    } else {
      setGrowingPlotId(displayData.id);
      setIsGrowingOpen(true);
    }
  };

  const handleClaim = () => {
    if (harvestPlotId) {
        harvestPlant(harvestPlotId);
        setHarvestPlotId(null);
        setIsHarvestOpen(false);
    }
  };

  const handleWater = () => {
    if (growingPlotId) {
        waterPlant(growingPlotId);
        setIsGrowingOpen(false);
    }
  };

  const handleFertilize = () => {
    if (growingPlotId) {
        fertilizePlant(growingPlotId);
        setIsGrowingOpen(false);
    }
  };

  const handleClearDead = () => {
      if (growingPlotId) {
          clearDeadPlant(growingPlotId);
          setIsGrowingOpen(false);
      }
  };

  const handleSelectSeed = (seedId: string) => {
      if (seedPlotId) {
          plantSeed(seedPlotId, seedId);
          setIsSeedOpen(false);
          setSeedPlotId(null);
      }
  };

  // Prepare data for Growing Popup
  const growingPlot = growingPlotId ? gameState.plots.find(p => p.id === growingPlotId) : null;
  const growingDisplayData = growingPlot ? getPlotDisplayData(growingPlot) : null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <GardenBackground />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader coins={gameState.bg} diamonds={gameState.diamonds} />
        
        {/* Bankruptcy Protection / Watch Ad Button */}
        {gameState.diamonds === 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full px-4 flex justify-center animate-bounce-soft">
            <Button
               onClick={watchAd}
               className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg border-2 border-purple-400 rounded-full px-6 py-4 font-bold"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Watch Ad (+1 💎)
            </Button>
          </div>
        )}

        {/* Garden Plots - Natural scattered layout */}
        <div className="flex flex-col items-center px-4 pt-24 pb-28">
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-3 gap-3">
              {gameState.plots.map((plot, index) => {
                const displayData = getPlotDisplayData(plot);
                return (
                  <div
                    key={plot.id}
                    className="flex justify-center"
                    style={{
                      transform: `translateY(${index % 2 === 0 ? '0px' : '8px'}) rotate(${(index - 4) * 1.5}deg)`
                    }}
                  >
                    <GardenPlot
                      state={displayData.state}
                      timeLeft={displayData.timeLeft}
                      onClick={() => handlePlotClick(displayData)}
                    />
                  </div>
                );
              })}
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
      <GrowingPopup
        isOpen={isGrowingOpen}
        onClose={() => setIsGrowingOpen(false)}
        onWater={handleWater}
        onFertilize={handleFertilize}
        onClear={handleClearDead}
        plantEmoji={growingDisplayData?.emoji || "🌱"}
        timeLeft={growingDisplayData?.timeLeft}
        isDead={growingDisplayData?.isDead}
      />

      {/* Seed Selection Popup */}
      <SeedPopup
        isOpen={isSeedOpen}
        onClose={() => setIsSeedOpen(false)}
        onSelectSeed={(seed: any) => handleSelectSeed(seed.id || seed.name)}
      />
    </div>
  );
};

export default Index;
