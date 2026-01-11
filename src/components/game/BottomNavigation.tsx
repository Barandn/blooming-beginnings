import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type NavItem = "game" | "leaderboard" | "weekly";

interface BottomNavigationProps {
  activeItem: string; // Changed to string to be flexible
  onItemClick: (item: string) => void;
}

const BottomNavigation = ({ activeItem, onItemClick }: BottomNavigationProps) => {
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);

  const navItems = [
    { id: "leaderboard", label: "Leaderboard", emoji: "🏆" },
    { id: "game", label: "SIUU", emoji: "⚽" },
    { id: "weekly", label: "Bonus", emoji: "🎁" },
  ];

  const handleClick = (id: string) => {
    if (id !== activeItem) {
      setAnimatingItem(id);
      onItemClick(id);
    }
  };

  useEffect(() => {
    if (animatingItem) {
      const timer = setTimeout(() => setAnimatingItem(null), 400);
      return () => clearTimeout(timer);
    }
  }, [animatingItem]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-black/80 backdrop-blur-xl rounded-full shadow-2xl border border-white/10 px-2 py-2 w-full">
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            const isAnimating = animatingItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={cn(
                    "relative flex flex-col items-center justify-center flex-1 py-3 rounded-full transition-all duration-300",
                    isActive ? "bg-blue-600 shadow-lg shadow-blue-900/50" : "hover:bg-white/5 active:scale-95"
                )}
              >
                <span
                  className={cn(
                    "text-2xl transition-all duration-300",
                    isAnimating ? "animate-bounce" : "",
                    isActive ? "scale-110" : "opacity-50 grayscale"
                  )}
                >
                  {item.emoji}
                </span>

                <span className={cn(
                    "text-[10px] font-bold mt-1 uppercase tracking-wide transition-all duration-300",
                     isActive ? "text-white" : "text-white/40"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
