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
        <div className="flex flex-col items-center px-5 pt-24 pb-28">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/60 via-white/30 to-emerald-50/60 blur-2xl" />
            <div className="relative rounded-[28px] border border-white/40 bg-white/70 shadow-[0_25px_60px_rgba(15,118,110,0.18)] backdrop-blur-md overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.15) 0, transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.15) 0, transparent 30%), radial-gradient(circle at 50% 90%, rgba(245,158,11,0.14) 0, transparent 45%)" }} />
              <div className="absolute top-4 left-4 right-4 h-12 rounded-2xl bg-white/60 border border-white/50 shadow-inner flex items-center px-4 gap-2 text-sm text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Modern Garden Grid • Drag & grow your blooms
              </div>

              <div className="relative grid grid-cols-3 gap-4 px-4 pb-6 pt-16">
                {allPlots.map((plot, index) => (
                  <div
                    key={index}
                    className="flex justify-center drop-shadow-sm"
                    style={{
                      transform: `translateY(${index % 2 === 0 ? '0px' : '6px'}) rotate(${(index - 4) * 1.2}deg)`
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

              <div className="absolute -left-6 bottom-6 h-16 w-16 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl" />
              <div className="absolute -right-10 -top-10 h-24 w-24 bg-gradient-to-br from-amber-200/50 to-primary/30 rounded-full blur-3xl" />
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
