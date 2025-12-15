import { Flower2, Store, Warehouse } from "lucide-react";

type NavItem = "garden" | "market" | "barn";

interface BottomNavigationProps {
  activeItem: NavItem;
  onItemClick: (item: NavItem) => void;
}

const BottomNavigation = ({ activeItem, onItemClick }: BottomNavigationProps) => {
  const navItems = [
    { id: "garden" as NavItem, label: "Garden", icon: Flower2, emoji: "🌸" },
    { id: "market" as NavItem, label: "Seed Market", icon: Store, emoji: "🏪" },
    { id: "barn" as NavItem, label: "Barn", icon: Warehouse, emoji: "🏠" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t-4 border-wood">
      <div className="flex justify-around items-center py-3 px-4 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              activeItem === item.id
                ? "bg-primary/20 scale-110"
                : "hover:bg-muted"
            }`}
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className={`text-xs font-semibold ${
              activeItem === item.id ? "text-primary" : "text-muted-foreground"
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
