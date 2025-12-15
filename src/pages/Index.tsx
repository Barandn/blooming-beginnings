import { useState } from "react";
import GardenPlot from "@/components/game/GardenPlot";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import GardenBackground from "@/components/game/GardenBackground";
import { toast } from "@/hooks/use-toast";

type NavItem = "garden" | "market" | "barn";

const Index = () => {
  const [activeNav, setActiveNav] = useState<NavItem>("garden");
  const [coins] = useState(1250);

  const handlePlotClick = (action: string) => {
    toast({
      title: action,
      description: "This feature is coming soon! 🌱",
    });
  };

  const plots = [
    { state: "empty" as const },
    { state: "seeded" as const, timeLeft: "04:59:00" },
    { state: "sprout" as const, timeLeft: "03:30:00", isWatering: true },
    { state: "growing" as const, timeLeft: "02:00:00" },
    { state: "flowering" as const, timeLeft: "00:30:00", isWatering: true },
    { state: "ready" as const },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <GardenBackground />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader coins={coins} />
        
        {/* Garden Grid */}
        <div className="flex flex-col items-center justify-center px-4 pt-8 pb-40">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8">
            {plots.map((plot, index) => (
              <GardenPlot
                key={index}
                state={plot.state}
                timeLeft={plot.timeLeft}
                isWatering={plot.isWatering}
                onClick={() => handlePlotClick(
                  plot.state === "empty" ? "Planting seed..." :
                  plot.state === "ready" ? "Harvesting..." :
                  "Growing..."
                )}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeItem={activeNav} 
        onItemClick={setActiveNav}
      />
    </div>
  );
};

export default Index;
