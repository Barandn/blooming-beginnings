import React, { useState } from "react";
import GameArea from "@/components/game/GameArea";
import Leaderboard from "@/components/game/Leaderboard";
import WeeklyPrize from "@/components/game/WeeklyPrize";
import BottomNavigation from "@/components/game/BottomNavigation";
import GameHeader from "@/components/game/GameHeader";

type Page = "game" | "leaderboard" | "weekly";

const Index = () => {
  const [activePage, setActivePage] = useState<Page>("game");

  const renderContent = () => {
    switch (activePage) {
      case "game":
        return <GameArea />;
      case "leaderboard":
        return <Leaderboard />;
      case "weekly":
        return <WeeklyPrize />;
      default:
        return <GameArea />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0f0d]">
      {/* Background Texture (Pitch) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-[#050a06] to-black -z-10" />
      
      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <GameHeader />
        
        <main className="flex-1 pt-20 pb-24">
            {renderContent()}
        </main>

        <BottomNavigation
            activeItem={activePage}
            onItemClick={(item) => setActivePage(item as Page)}
        />
      </div>
    </div>
  );
};

export default Index;
