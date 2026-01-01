import { useState, useEffect } from "react";

type NavItem = "garden" | "market" | "barn";

interface BottomNavigationProps {
  activeItem: NavItem;
  onItemClick: (item: NavItem) => void;
}

const BottomNavigation = ({ activeItem, onItemClick }: BottomNavigationProps) => {
  const [animatingItem, setAnimatingItem] = useState<NavItem | null>(null);

  const navItems = [
    { id: "garden" as NavItem, label: "Farm", emoji: "🌾" },
    { id: "market" as NavItem, label: "Market", emoji: "🛒" },
    { id: "barn" as NavItem, label: "Barn", emoji: "🏠" },
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
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 px-3 py-2.5">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeItem === item.id;
            const isAnimating = animatingItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`relative flex flex-col items-center justify-center px-5 py-2 rounded-2xl transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30"
                    : "hover:bg-slate-100/80 active:scale-95"
                }`}
              >
                <span
                  className={`text-2xl transition-all duration-300 ${
                    isAnimating ? "animate-nav-pop" : ""
                  } ${isActive ? "scale-110 drop-shadow-md" : ""}`}
                >
                  {item.emoji}
                </span>

                <span className={`text-[10px] font-bold mt-0.5 transition-all duration-300 ${
                  isActive ? "text-white" : "text-slate-500"
                }`}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
