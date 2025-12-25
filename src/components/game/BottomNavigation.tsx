import { useState, useEffect } from "react";

type NavItem = "garden" | "market" | "barn";

interface BottomNavigationProps {
  activeItem: NavItem;
  onItemClick: (item: NavItem) => void;
}

const BottomNavigation = ({ activeItem, onItemClick }: BottomNavigationProps) => {
  const [animatingItem, setAnimatingItem] = useState<NavItem | null>(null);

  const navItems = [
    { id: "garden" as NavItem, label: "Çiftlik", emoji: "🌾" },
    { id: "market" as NavItem, label: "Pazar", emoji: "🛒" },
    { id: "barn" as NavItem, label: "Ahır", emoji: "🏠" },
  ];

  const handleClick = (id: NavItem) => {
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-card/90 backdrop-blur-xl rounded-full shadow-xl border border-border/30 px-2 py-2">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            const isAnimating = animatingItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`relative flex flex-col items-center justify-center px-5 py-2 rounded-full transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-primary shadow-lg"
                    : "hover:bg-muted/60 active:scale-95"
                }`}
              >
                <span 
                  className={`text-2xl transition-all duration-300 ${
                    isAnimating ? "animate-nav-pop" : ""
                  } ${isActive ? "scale-110" : ""}`}
                >
                  {item.emoji}
                </span>
                
                <span className={`text-[10px] font-bold mt-0.5 transition-all duration-300 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }`}>
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
