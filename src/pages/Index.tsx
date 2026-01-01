import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GardenPlot from "@/components/game/GardenPlot";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import GardenBackground from "@/components/game/GardenBackground";
import HarvestPopup from "@/components/game/HarvestPopup";
import GrowingPopup from "@/components/game/GrowingPopup";
import SeedPopup from "@/components/game/SeedPopup";
import TutorialOverlay from "@/components/game/TutorialOverlay";
import { useGame, PlotData } from "@/context/GameContext";
import { PLANT_TYPES } from "@/config/gameConfig";

type NavItem = "garden" | "market" | "barn";

const Index = () => {
  const { state, waterPlant, fertilizePlant, harvestPlant, clearDeadPlant, claimDailyBonus } = useGame();
  const [activeNav, setActiveNav] = useState<NavItem>("garden");

  // Popup States
  const [harvestPlotId, setHarvestPlotId] = useState<number | null>(null);
  const [growingPlotId, setGrowingPlotId] = useState<number | null>(null);
  const [isSeedOpen, setIsSeedOpen] = useState(false); // Legacy component kept for now, but not used as tutorial points to market
  // Actually, specs say "Finger points to Empty Pot -> Plant Seed".
  // We need a way to plant. The "SeedPopup" in original code was just a selection.
  // We need to implement planting logic.
  // For now, if user clicks empty plot, if they have inventory, show selection?
  // Or just "Plant Daisy" if they only have that?
  // Let's reuse SeedPopup but populate with inventory.
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    claimDailyBonus();
  }, []);

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "market") {
      navigate("/market");
    } else if (item === "barn") {
      navigate("/barn");
    }
  };

  const handlePlotClick = (plot: PlotData) => {
    if (plot.state === "ready") {
      setHarvestPlotId(plot.id);
    } else if (plot.state === "empty") {
      setSelectedPlotId(plot.id);
      setIsSeedOpen(true);
    } else if (plot.state === "growing" || plot.state === "thirsty") {
      setGrowingPlotId(plot.id);
    } else if (plot.state === "dead") {
        clearDeadPlant(plot.id);
    }
  };

  const handleWater = () => {
    if (growingPlotId !== null) {
      waterPlant(growingPlotId);
      setGrowingPlotId(null);
    }
  };

  const handleFertilize = () => {
    if (growingPlotId !== null) {
      fertilizePlant(growingPlotId);
      setGrowingPlotId(null);
    }
  };

  const handleHarvest = () => {
      if (harvestPlotId !== null) {
          harvestPlant(harvestPlotId);
          setHarvestPlotId(null);
      }
  }

  // Calculate props for Growing Popup
  const growingPlot = growingPlotId !== null ? state.plots[growingPlotId] : null;
  const growingPlantType = growingPlot?.plantId ? PLANT_TYPES[growingPlot.plantId] : null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <GardenBackground />
      
      <TutorialOverlay />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader />
        
        {/* Garden Plots - Modern 2025 Design */}
        <div className="flex flex-col items-center justify-center px-4 pt-20 pb-28 min-h-[calc(100vh-180px)]">
          {/* Garden Title */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white/90 drop-shadow-md tracking-wide">
              My Garden
            </h2>
          </div>

          {/* Modern Garden Container */}
          <div className="w-full max-w-sm">
            <div className="garden-container relative bg-gradient-to-b from-amber-900/20 to-amber-950/30 backdrop-blur-sm rounded-3xl p-4 border border-amber-800/20 shadow-2xl">
              {/* Decorative corner elements */}
              <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-amber-600/40 rounded-tl-lg"></div>
              <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-amber-600/40 rounded-tr-lg"></div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-amber-600/40 rounded-bl-lg"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-amber-600/40 rounded-br-lg"></div>

              {/* Grid Layout */}
              <div className="grid grid-cols-3 gap-4">
                {state.plots.map((plot) => {
                    // Format Time Left
                    let timeLeftStr = undefined;
                    if (plot.state === "growing" || plot.state === "thirsty") {
                        if (plot.plantId) {
                             const plant = PLANT_TYPES[plot.plantId];
                             const now = Date.now();
                             const timeSinceWater = now - plot.lastWaterTime;

                             if (plot.state === "growing") {
                                 const msLeft = plant.wateringInterval - timeSinceWater;
                                 if (msLeft > 0) {
                                     const h = Math.floor(msLeft / (1000 * 60 * 60));
                                     const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
                                     timeLeftStr = `${h}h ${m}m`;
                                 } else {
                                     timeLeftStr = "0m";
                                 }
                             } else { // Thirsty
                                 // Show grace period left?
                                 const timeThirsty = timeSinceWater - plant.wateringInterval;
                                 const msLeft = plot.currentGracePeriod - timeThirsty;
                                 if (msLeft > 0) {
                                     const h = Math.floor(msLeft / (1000 * 60 * 60));
                                     const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
                                     timeLeftStr = `DIE: ${h}h ${m}m`;
                                 } else {
                                     timeLeftStr = "DEAD";
                                 }
                             }
                        }
                    }

                    return (
                      <div
                        key={plot.id}
                        className="flex justify-center items-center"
                      >
                        <GardenPlot
                          state={plot.state}
                          plantType={plot.plantId ? PLANT_TYPES[plot.plantId] : undefined}
                          timeLeft={timeLeftStr}
                          onClick={() => handlePlotClick(plot)}
                        />
                      </div>
                    );
                })}
              </div>
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
        isOpen={harvestPlotId !== null}
        onClose={() => setHarvestPlotId(null)}
        onClaim={handleHarvest}
        flowerEmoji={harvestPlotId !== null && state.plots[harvestPlotId].plantId ? PLANT_TYPES[state.plots[harvestPlotId].plantId!].emoji : "🌸"}
        seedCost={harvestPlotId !== null && state.plots[harvestPlotId].plantId ? PLANT_TYPES[state.plots[harvestPlotId].plantId!].seedCost : 0}
      />

      {/* Growing Popup */}
      <GrowingPopup
        isOpen={growingPlotId !== null}
        onClose={() => setGrowingPlotId(null)}
        onWater={handleWater}
        onFertilize={handleFertilize}
        plantEmoji={growingPlantType?.emoji || "🌱"}
        isThirsty={growingPlot?.state === "thirsty"}
        cyclesRemaining={growingPlot ? growingPlot.totalCyclesNeeded - growingPlot.waterCount : 0}
        totalCycles={growingPlot?.totalCyclesNeeded || 0}
      />

      {/* Seed Selection Popup - Modified to use Inventory */}
      <SeedPopup
        isOpen={isSeedOpen}
        onClose={() => setIsSeedOpen(false)}
        selectedPlotId={selectedPlotId}
      />
    </div>
  );
};

export default Index;
