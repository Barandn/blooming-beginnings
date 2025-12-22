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
  // Or just "Plant Papatya" if they only have that?
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
        
        {/* Garden Plots - Natural scattered layout */}
        <div className="flex flex-col items-center px-4 pt-24 pb-28">
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-3 gap-3">
              {state.plots.map((plot, index) => {
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
                      className="flex justify-center"
                      style={{
                        transform: `translateY(${index % 2 === 0 ? '0px' : '8px'}) rotate(${(index - 4) * 1.5}deg)`
                      }}
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
