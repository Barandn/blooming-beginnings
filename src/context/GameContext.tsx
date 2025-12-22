
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FLOWER_TYPES, FlowerSpecies, ECONOMY } from '../data/gameData';
import { toast } from 'sonner';

interface Plant {
  id: string;
  speciesId: string;
  plantedAt: number; // Timestamp
  lastWateredAt: number; // Timestamp
  waterCount: number; // Current water cycles
  totalCyclesNeeded: number; // Can be reduced by fertilizer
  gracePeriodHours: number; // Randomized on plant
  isDead: boolean;
  isHarvestable: boolean;
}

interface Plot {
  id: string;
  plant: Plant | null;
}

interface GameState {
  diamonds: number;
  bg: number; // Soft currency
  plots: Plot[];
  inventory: Record<string, number>; // speciesId -> count
  lastBonusClaimedAt: number | null;
}

interface GameContextType {
  state: GameState;
  buySeed: (speciesId: string) => void;
  plantSeed: (plotId: string, speciesId: string) => void;
  waterPlant: (plotId: string) => void;
  fertilizePlant: (plotId: string) => void;
  harvestPlant: (plotId: string) => void;
  clearDeadPlant: (plotId: string) => void;
  collectDailyBonus: () => void;
  watchAd: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const INITIAL_PLOTS = Array.from({ length: 4 }, (_, i) => ({ id: `plot-${i}`, plant: null }));

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('gameState');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed ? { ...parsed, lastBonusClaimedAt: parsed.lastBonusClaimedAt || null } : {
      diamonds: ECONOMY.STARTING_DIAMONDS,
      bg: 0,
      plots: INITIAL_PLOTS,
      inventory: {},
      lastBonusClaimedAt: null,
    };
  });

  // Persist state
  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(state));
  }, [state]);

  // Game Loop (Check for withering and harvestable status)
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const newPlots = prev.plots.map(plot => {
          if (!plot.plant || plot.plant.isDead) return plot;

          const plant = plot.plant;
          const species = FLOWER_TYPES.find(f => f.id === plant.speciesId)!;

          // Check for harvestable
          if (plant.waterCount >= plant.totalCyclesNeeded && !plant.isHarvestable) {
            return { ...plot, plant: { ...plant, isHarvestable: true } };
          }

          // Check for withering
          // Logic: If (Now - LastWatered) > (WaterInterval + GracePeriod)
          const timeSinceWatered = (now - plant.lastWateredAt) / (1000 * 60 * 60); // Hours
          const maxTime = species.wateringInterval + plant.gracePeriodHours;

          if (timeSinceWatered > maxTime && !plant.isHarvestable) {
            return { ...plot, plant: { ...plant, isDead: true } };
          }

          return plot;
        });

        // Only update if something changed to avoid re-renders (deep comparison is expensive, simplistic check here)
        // For now, we update to trigger re-renders on timers
        return { ...prev, plots: newPlots };
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const buySeed = (speciesId: string) => {
    const species = FLOWER_TYPES.find(s => s.id === speciesId);
    if (!species) return;

    if (state.diamonds >= species.seedCost) {
      setState(prev => ({
        ...prev,
        diamonds: prev.diamonds - species.seedCost,
        inventory: {
          ...prev.inventory,
          [speciesId]: (prev.inventory[speciesId] || 0) + 1
        }
      }));
      toast.success(`Bought ${species.name} Seed!`);
    } else {
      toast.error("Not enough Diamonds!");
    }
  };

  const plantSeed = (plotId: string, speciesId: string) => {
    if ((state.inventory[speciesId] || 0) <= 0) {
      toast.error("No seeds available!");
      return;
    }

    const species = FLOWER_TYPES.find(s => s.id === speciesId)!;
    const gracePeriod = Math.floor(Math.random() * (species.gracePeriodMax - species.gracePeriodMin + 1)) + species.gracePeriodMin;

    const newPlant: Plant = {
      id: crypto.randomUUID(),
      speciesId,
      plantedAt: Date.now(),
      lastWateredAt: Date.now(),
      waterCount: 0,
      totalCyclesNeeded: species.waterCycles,
      gracePeriodHours: gracePeriod,
      isDead: false,
      isHarvestable: false
    };

    setState(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [speciesId]: prev.inventory[speciesId] - 1
      },
      plots: prev.plots.map(p => p.id === plotId ? { ...p, plant: newPlant } : p)
    }));
    toast.success("Planted seed!");
  };

  const waterPlant = (plotId: string) => {
    const plot = state.plots.find(p => p.id === plotId);
    if (!plot || !plot.plant || plot.plant.isDead || plot.plant.isHarvestable) return;

    if (state.diamonds >= ECONOMY.WATER_COST) {
      setState(prev => ({
        ...prev,
        diamonds: prev.diamonds - ECONOMY.WATER_COST,
        plots: prev.plots.map(p => {
            if (p.id !== plotId || !p.plant) return p;
            return {
                ...p,
                plant: {
                    ...p.plant,
                    lastWateredAt: Date.now(),
                    waterCount: p.plant.waterCount + 1
                }
            };
        })
      }));
      toast.success("Watered plant!");
    } else {
      toast.error("Not enough Diamonds to water!");
    }
  };

  const fertilizePlant = (plotId: string) => {
    const plot = state.plots.find(p => p.id === plotId);
    if (!plot || !plot.plant || plot.plant.isDead || plot.plant.isHarvestable) return;

    if (state.bg >= ECONOMY.FERTILIZER_COST) {
       setState(prev => ({
        ...prev,
        bg: prev.bg - ECONOMY.FERTILIZER_COST,
        plots: prev.plots.map(p => {
            if (p.id !== plotId || !p.plant) return p;
            const reduction = Math.floor(p.plant.totalCyclesNeeded * ECONOMY.FERTILIZER_EFFICIENCY);
            // Ensure at least 1 cycle needed always? Or can it go to 0? Spec says "Reduces cycles by 25%, floor rounded".
            // Let's assume it reduces the TOTAL needed.
            // Check if reduction makes it instantly harvestable (current count >= new total)
            const newTotal = Math.max(1, p.plant.totalCyclesNeeded - reduction);

            return {
                ...p,
                plant: {
                    ...p.plant,
                    totalCyclesNeeded: newTotal
                }
            };
        })
      }));
      toast.success("Used Fertilizer!");
    } else {
      toast.error("Not enough B&G!");
    }
  };

  const harvestPlant = (plotId: string) => {
    const plot = state.plots.find(p => p.id === plotId);
    if (!plot || !plot.plant || !plot.plant.isHarvestable) return;

    const species = FLOWER_TYPES.find(s => s.id === plot.plant!.speciesId)!;
    const diamondReward = species.seedCost * ECONOMY.HARVEST_DIAMOND_MULTIPLIER;
    // Growth Factor = waterCycles. Logic: Harder plants yield more B&G.
    const growthFactor = species.waterCycles;
    const baseBg = Math.floor(Math.random() * (ECONOMY.BG_REWARD_MAX - ECONOMY.BG_REWARD_MIN + 1)) + ECONOMY.BG_REWARD_MIN;
    const bgReward = baseBg * growthFactor;

    setState(prev => ({
      ...prev,
      diamonds: prev.diamonds + diamondReward,
      bg: prev.bg + bgReward,
      plots: prev.plots.map(p => p.id === plotId ? { ...p, plant: null } : p)
    }));
    toast.success(`Harvested! +${diamondReward} 💎, +${bgReward} B&G`);
  };

  const clearDeadPlant = (plotId: string) => {
    const plot = state.plots.find(p => p.id === plotId);
    if (!plot || !plot.plant || !plot.plant.isDead) return;

    const species = FLOWER_TYPES.find(s => s.id === plot.plant!.speciesId)!;
    const refund = species.seedCost;

    setState(prev => ({
      ...prev,
      diamonds: prev.diamonds + refund,
      plots: prev.plots.map(p => p.id === plotId ? { ...p, plant: null } : p)
    }));
    toast.success(`Cleared dead plant. Refunded ${refund} 💎`);
  };

  const collectDailyBonus = () => {
      const now = Date.now();
      const lastClaim = state.lastBonusClaimedAt || 0;
      if (now - lastClaim < 24 * 60 * 60 * 1000) {
          const remaining = 24 * 60 * 60 * 1000 - (now - lastClaim);
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          toast.error(`Bonus available in ${hours} hours`);
          return;
      }

      setState(prev => ({
          ...prev,
          bg: prev.bg + ECONOMY.STARTING_BG,
          lastBonusClaimedAt: now
      }));
      toast.success(`Collected Daily Bonus: +${ECONOMY.STARTING_BG} B&G`);
  };

  const watchAd = () => {
      setState(prev => ({
          ...prev,
          diamonds: prev.diamonds + 1
      }));
      // Toast handled in UI or here? App.tsx handles the async toast, so maybe I just call this inside success.
      // But App.tsx doesn't have access to this function inside the toast callback easily unless I expose it.
  };

  const resetGame = () => {
    setState({
      diamonds: ECONOMY.STARTING_DIAMONDS,
      bg: 0,
      plots: INITIAL_PLOTS,
      inventory: {},
      lastBonusClaimedAt: null,
    });
    localStorage.removeItem('gameState');
    toast.info("Game Reset!");
  };

  return (
    <GameContext.Provider value={{ state, buySeed, plantSeed, waterPlant, fertilizePlant, harvestPlant, clearDeadPlant, collectDailyBonus, watchAd, resetGame }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
