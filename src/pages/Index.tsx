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
      description: "Bu özellik yakında eklenecek! 🌱",
    });
  };

  const plots = [
    { state: "empty" as const, plantEmoji: "🌱" },
    { state: "growing" as const, timeLeft: "04:59:00 left", plantEmoji: "🌱" },
    { state: "growing" as const, timeLeft: "04:59:00 left", plantEmoji: "🌿" },
    { state: "watering" as const, timeLeft: "04:59:00 left", plantEmoji: "🌸" },
    { state: "growing" as const, timeLeft: "04:59:00 left", plantEmoji: "🌷" },
    { state: "ready" as const, plantEmoji: "🌺" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-grass-light">
      {/* Background */}
      <GardenBackground />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <GameHeader coins={coins} />
        
        {/* Garden Grid */}
        <div className="flex flex-col items-center justify-center px-4 pt-8 pb-32">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10">
            {plots.map((plot, index) => (
              <GardenPlot
                key={index}
                state={plot.state}
                timeLeft={plot.timeLeft}
                plantEmoji={plot.plantEmoji}
                onClick={() => handlePlotClick(
                  plot.state === "empty" ? "Tohum ekiliyor..." :
                  plot.state === "ready" ? "Hasat ediliyor..." :
                  plot.state === "watering" ? "Sulanıyor..." :
                  "Büyüyor..."
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
