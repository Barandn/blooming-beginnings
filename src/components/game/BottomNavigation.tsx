import { useState, useEffect } from "react";

type NavItem = "garden" | "market" | "barn";

interface BottomNavigationProps {
  activeItem: NavItem;
  onItemClick: (item: NavItem) => void;
}

const BottomNavigation = ({ activeItem, onItemClick }: BottomNavigationProps) => {
  const [animatingItem, setAnimatingItem] = useState<NavItem | null>(null);

  const navItems = [
    { id: "garden" as NavItem, label: "Bahçe", emoji: "🌸" },
    { id: "market" as NavItem, label: "Tohum Pazarı", emoji: "🏪" },
    { id: "barn" as NavItem, label: "Ambar", emoji: "🏠" },
  ];

  const handleClick = (id: NavItem) => {
    setAnimatingItem(id);
    onItemClick(id);
  };

  useEffect(() => {
    if (animatingItem) {
      const timer = setTimeout(() => setAnimatingItem(null), 300);
      return () => clearTimeout(timer);
    }
  }, [animatingItem]);

  return (
    <div className="fixed bottom-0 left-0 right-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/95 to-transparent h-24 -top-8 pointer-events-none" />
      
      {/* Navigation container */}
      <div className="relative bg-card/80 backdrop-blur-md border-t border-border/50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-end py-3 px-4 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            const isAnimating = animatingItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`relative flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary/15 -translate-y-2"
                    : "hover:bg-muted/50"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
                
                {/* Emoji with animation */}
                <span 
                  className={`text-3xl transition-transform duration-200 ${
                    isActive ? "scale-110" : ""
                  } ${isAnimating ? "animate-nav-pop" : ""}`}
                >
                  {item.emoji}
                </span>
                
                {/* Label */}
                <span className={`text-[10px] font-bold transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>

                {/* Glow effect for active */}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl -z-10" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Home indicator bar */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1 bg-foreground/20 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
