import { useState } from "react";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Diamond, Droplets, Sparkles, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/context/GameContext";
import { PLANT_TYPES, GAME_CONFIG } from "@/config/gameConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import TutorialOverlay from "@/components/game/TutorialOverlay";

type NavItem = "garden" | "market" | "barn";

const Market = () => {
  const { state, buySeed, setTutorialStep } = useGame();
  const [activeNav, setActiveNav] = useState<NavItem>("market");
  const navigate = useNavigate();

  useEffect(() => {
    if (state.tutorialStep === 1) {
      setTutorialStep(2);
    }
  }, [state.tutorialStep, setTutorialStep]);

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "garden") {
      navigate("/");
    } else if (item === "barn") {
      navigate("/barn");
    }
  };

  const handleBuySeed = (plantId: string) => {
      buySeed(plantId);
  };

  // NOTE: In this game logic, Water is bought ON DEMAND when clicking the plant, not stored in inventory.
  // Same for Fertilizer? Or should Fertilizer be an inventory item?
  // Spec says: "Uses: Buying Seeds AND Buying Water."
  // "Action - Fertilizing... User taps 'Add Fertilizer (Cost: 500 B&G)'".
  // This implies direct spend.
  // However, "Market Layout... Tab 1 (Essentials): Water (Price: 💎), Fertilizer (Price: B&G). Big Buttons."
  // This implies we CAN buy them here.
  // If we buy here, they must be stored in Inventory?
  // But the Context `waterPlant` function deducts Diamonds directly.
  // If I add "Buy Water" here, does it add a "Water Token"?
  // Re-reading Spec: "Pricing & ROI Logic: Water Price: Fixed at 1 Diamond per unit."
  // "Action - Watering: ... Popup: 'Water needed! Cost: 1 💎'".
  // This strongly suggests Direct Debit.
  // Maybe the Market "Essentials" tab is just informational? Or maybe it allows buying "Stock"?
  // But `waterPlant` checks `state.diamonds`.
  // If I implement stock, I need to change `waterPlant`.
  // Spec: "Tab 1 (Essentials): Water (Price: 💎), Fertilizer (Price: B&G). Big Buttons."
  // Let's assume these buttons are just Shortcuts to "Buy a pack" or maybe they are just listing the prices?
  // Or maybe "Buy Water" here means "Buy 10 Water Units" for 10 Diamonds?
  // But if the price is 1:1, there is no benefit.
  // I will make them "Informational" or "Bulk Buy" buttons?
  // Actually, let's keep it simple. If I click "Buy Water" here, maybe it just explains how it works?
  // OR, maybe I should change `GameContext` to support "Water Inventory"?
  // Spec says: "Uses: Buying Seeds AND Buying Water." (Diamonds use).
  // "User taps Pot B -> Popup: 'Water needed! Cost: 1 💎'". -> This is direct debit.
  // So the Market entry for Water might be redundant or just a visual "This is where you see the price".
  // I'll make the buttons disabled or just show info toast "Water is purchased directly when watering plants!".

  const handleBuyWaterInfo = () => {
      toast({
          title: "Water Info",
          description: "Water costs 1 Diamond per use. Water your crops directly when they're thirsty!",
      });
  };

  const handleBuyFertilizerInfo = () => {
      toast({
          title: "Fertilizer Info",
          description: "Fertilizer costs 500 B&G. Apply to growing crops to speed them up!",
      });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-amber-100 to-amber-200">
      <TutorialOverlay />
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B4513' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <GameHeader />

        <div className="pt-20 pb-24 px-4 h-screen flex flex-col">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl flex-1 overflow-hidden flex flex-col">
                <div className="p-4 bg-amber-800/10 border-b border-amber-200">
                    <h1 className="text-2xl font-bold text-amber-900 text-center">Marketplace</h1>
                </div>

                <Tabs defaultValue="seeds" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 p-1 bg-amber-100/50">
                        <TabsTrigger value="essentials" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">Essentials</TabsTrigger>
                        <TabsTrigger value="seeds" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">Seeds</TabsTrigger>
                    </TabsList>

                    <TabsContent value="essentials" className="flex-1 p-4 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col items-center text-center space-y-2">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Droplets className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="font-bold text-lg text-blue-900">Water</h3>
                            <p className="text-sm text-blue-700">Required for crop survival.</p>
                            <div className="flex items-center gap-1 font-bold text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                <span>Price: {GAME_CONFIG.waterCost}</span>
                                <Diamond className="w-3 h-3" />
                            </div>
                            <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={handleBuyWaterInfo}>
                                Info
                            </Button>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col items-center text-center space-y-2">
                            <div className="p-3 bg-amber-100 rounded-full">
                                <Sparkles className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="font-bold text-lg text-amber-900">Fertilizer</h3>
                            <p className="text-sm text-amber-700">Reduces growth time by 25%.</p>
                            <div className="flex items-center gap-1 font-bold text-amber-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                <span>Price: {GAME_CONFIG.fertilizerCost}</span>
                                <Coins className="w-3 h-3 text-yellow-500" />
                            </div>
                            <Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={handleBuyFertilizerInfo}>
                                Info
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="seeds" className="flex-1 p-0">
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-1 gap-3 p-4 pb-20">
                                {Object.values(PLANT_TYPES).map((plant) => (
                                    <div key={plant.id} className="bg-white border border-amber-200 rounded-xl p-3 flex items-center gap-4 shadow-sm relative overflow-hidden">
                                        {/* Background Decoration */}
                                        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-amber-50 to-transparent pointer-events-none" />

                                        <div className="w-16 h-16 bg-amber-100 rounded-lg flex items-center justify-center text-4xl shadow-inner border border-amber-200 flex-shrink-0">
                                            {plant.emoji}
                                        </div>

                                        <div className="flex-1 min-w-0 z-10">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-amber-900 truncate">{plant.name}</h3>
                                                <div className="flex items-center gap-1 bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full text-xs font-bold border border-cyan-200">
                                                    {plant.seedCost} <Diamond className="w-3 h-3" />
                                                </div>
                                            </div>

                                            <p className="text-xs text-amber-700 mt-1 line-clamp-2">{plant.description}</p>

                                            <div className="flex flex-wrap gap-1 mt-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                                    plant.difficulty === "Easy" ? "bg-green-100 text-green-700 border-green-200" :
                                                    plant.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                    "bg-red-100 text-red-700 border-red-200"
                                                }`}>
                                                    {plant.difficulty}
                                                </span>
                                                <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                                    {plant.totalWaterCycles} Cycles
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            className="h-full px-4 bg-green-600 hover:bg-green-700 z-10"
                                            onClick={() => handleBuySeed(plant.id)}
                                        >
                                            Buy
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeItem={activeNav} 
        onItemClick={handleNavClick}
      />
    </div>
  );
};

export default Market;
