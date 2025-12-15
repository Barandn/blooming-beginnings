import { useState } from "react";
import GameHeader from "@/components/game/GameHeader";
import BottomNavigation from "@/components/game/BottomNavigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Diamond } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type NavItem = "garden" | "market" | "barn";

interface Seed {
  emoji: string;
  name: string;
  price: number;
  growTime: string;
  reward: number;
}

const allSeeds: Seed[] = [
  { emoji: "🌺", name: "Hibiscus", price: 5, growTime: "2h", reward: 20 },
  { emoji: "🌻", name: "Sunflower", price: 8, growTime: "3h", reward: 25 },
  { emoji: "🌷", name: "Tulip", price: 3, growTime: "1h", reward: 15 },
  { emoji: "🌹", name: "Rose", price: 15, growTime: "4h", reward: 35 },
  { emoji: "🌸", name: "Cherry Blossom", price: 12, growTime: "3h", reward: 30 },
  { emoji: "💐", name: "Bouquet", price: 25, growTime: "6h", reward: 50 },
  { emoji: "🪻", name: "Hyacinth", price: 6, growTime: "2h", reward: 18 },
  { emoji: "🌼", name: "Daisy", price: 2, growTime: "45m", reward: 12 },
  { emoji: "🪷", name: "Lotus", price: 20, growTime: "5h", reward: 45 },
  { emoji: "🌵", name: "Cactus Flower", price: 10, growTime: "8h", reward: 40 },
  { emoji: "🍀", name: "Lucky Clover", price: 30, growTime: "12h", reward: 70 },
  { emoji: "🌾", name: "Wheat", price: 4, growTime: "1h", reward: 14 },
];

// Group seeds into rows of 3
const seedRows = allSeeds.reduce((acc, seed, index) => {
  const rowIndex = Math.floor(index / 3);
  if (!acc[rowIndex]) acc[rowIndex] = [];
  acc[rowIndex].push(seed);
  return acc;
}, [] as Seed[][]);

const Market = () => {
  const [activeNav, setActiveNav] = useState<NavItem>("market");
  const [coins] = useState(1250);
  const [diamonds, setDiamonds] = useState(50);
  const navigate = useNavigate();

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item);
    if (item === "garden") {
      navigate("/");
    } else if (item === "barn") {
      navigate("/barn");
    }
  };

  const handleBuySeed = (seed: Seed) => {
    if (diamonds >= seed.price) {
      setDiamonds(prev => prev - seed.price);
      toast({
        title: `${seed.emoji} ${seed.name} purchased!`,
        description: `Seed added to your inventory. -${seed.price} 💎`,
      });
    } else {
      toast({
        title: "Not enough diamonds!",
        description: `You need ${seed.price - diamonds} more diamonds.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-amber-100 to-amber-200">
      {/* Flower shop wallpaper background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B4513' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with diamonds */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-amber-800/95 to-amber-900/90 backdrop-blur-sm border-b-2 border-amber-600/50 shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏪</span>
              <h1 className="text-xl font-bold text-amber-100">Flower Market</h1>
            </div>
            <div className="flex items-center gap-2 bg-amber-950/50 px-3 py-1.5 rounded-full border border-amber-500/30">
              <Diamond className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-300 font-bold">{diamonds}</span>
            </div>
          </div>
        </div>

        {/* Shelf area */}
        <ScrollArea className="h-screen pt-16 pb-24">
          <div className="px-4 py-4">
            {/* Shop welcome */}
            <div className="text-center mb-4 bg-amber-800/20 rounded-2xl p-3 border border-amber-600/30">
              <p className="text-amber-900 font-medium text-sm">🌸 Welcome to the Flower Shop! 🌸</p>
              <p className="text-amber-700 text-xs mt-1">Buy seeds with diamonds and grow beautiful flowers</p>
            </div>

            {/* Shelf rows */}
            <div className="space-y-1">
              {seedRows.map((row, rowIndex) => (
                <div key={rowIndex} className="relative">
                  {/* Shelf with seeds */}
                  <div className="relative bg-gradient-to-b from-amber-700/90 to-amber-800/95 rounded-t-xl pt-3 px-2 pb-1">
                    {/* Wood grain texture overlay */}
                    <div 
                      className="absolute inset-0 opacity-30 rounded-t-xl"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          90deg,
                          transparent,
                          transparent 2px,
                          rgba(139, 69, 19, 0.3) 2px,
                          rgba(139, 69, 19, 0.3) 4px
                        )`,
                      }}
                    />
                    
                    {/* Seeds on shelf */}
                    <div className="relative grid grid-cols-3 gap-2">
                      {row.map((seed, seedIndex) => (
                        <Button
                          key={seedIndex}
                          onClick={() => handleBuySeed(seed)}
                          variant="ghost"
                          className="h-auto flex flex-col items-center p-2 bg-gradient-to-b from-amber-100/90 to-amber-200/90 hover:from-amber-50 hover:to-amber-100 rounded-xl border-2 border-amber-400/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                          {/* Seed packet design */}
                          <div className="relative">
                            <div className="w-14 h-16 bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300 shadow-inner flex flex-col items-center justify-center overflow-hidden">
                              {/* Packet top fold */}
                              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-amber-300 to-amber-200 border-b border-amber-400" />
                              
                              {/* Flower emoji */}
                              <span className="text-3xl mt-2 filter drop-shadow-sm">{seed.emoji}</span>
                            </div>
                            
                            {/* Price tag */}
                            <div className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-md border border-cyan-300">
                              <Diamond className="w-3 h-3 text-white" />
                              <span className="text-white text-[10px] font-bold">{seed.price}</span>
                            </div>
                          </div>
                          
                          {/* Seed name */}
                          <span className="text-amber-900 font-bold text-[10px] mt-1.5 text-center leading-tight">{seed.name}</span>
                          
                          {/* Info badges */}
                          <div className="flex gap-1 mt-1">
                            <span className="text-[8px] bg-amber-300/50 text-amber-800 px-1.5 py-0.5 rounded-full">⏱️{seed.growTime}</span>
                            <span className="text-[8px] bg-yellow-300/50 text-amber-800 px-1.5 py-0.5 rounded-full">🪙+{seed.reward}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Shelf plank (3D effect) */}
                  <div className="relative">
                    {/* Main plank */}
                    <div 
                      className="h-4 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 rounded-b-lg"
                      style={{
                        boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
                      }}
                    />
                    {/* Plank edge highlight */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 via-amber-400/70 to-amber-500/50 rounded-t" />
                    {/* Plank bottom shadow */}
                    <div className="h-2 bg-gradient-to-b from-amber-900/40 to-transparent" />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom decoration */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 bg-amber-800/30 px-4 py-2 rounded-full border border-amber-600/40">
                <span>🌱</span>
                <span className="text-amber-800 text-sm font-medium">More seeds coming soon!</span>
                <span>🌱</span>
              </div>
            </div>
          </div>
        </ScrollArea>
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
