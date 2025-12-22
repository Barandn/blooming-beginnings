import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { GAME_CONFIG, PLANT_TYPES, PlantType } from "@/config/gameConfig";
import { toast } from "@/hooks/use-toast";

export type PlotState = "empty" | "growing" | "thirsty" | "dead" | "ready";

export interface PlotData {
  id: number;
  state: PlotState;
  plantId?: string; // key of PLANT_TYPES
  plantTimestamp: number; // When it was planted
  lastWaterTime: number; // When it was last watered
  waterCount: number; // How many times watered
  totalCyclesNeeded: number; // Adjusted by fertilizer
  currentGracePeriod: number; // Randomized per planting
  isFertilized: boolean;
}

interface GameState {
  diamonds: number;
  bng: number; // B&G Currency
  inventory: Record<string, number>; // plantId -> count
  plots: PlotData[];
  lastDailyBonus: number; // Timestamp
  tutorialStep: number; // 0: Finished, 1: Market, 2: Buy Seed, 3: Plant
  monthlyProfit: number; // Tracked for leaderboard
}

interface GameContextType {
  state: GameState;
  buySeed: (plantId: string) => void;
  plantSeed: (plotId: number, plantId: string) => void;
  waterPlant: (plotId: number) => void;
  fertilizePlant: (plotId: number) => void;
  harvestPlant: (plotId: number) => void;
  clearDeadPlant: (plotId: number) => void;
  claimDailyBonus: () => void;
  setTutorialStep: (step: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = "grand_master_farm_save_v1";

const INITIAL_STATE: GameState = {
  diamonds: GAME_CONFIG.startingDiamonds,
  bng: GAME_CONFIG.startingBnG,
  inventory: {},
  plots: Array.from({ length: GAME_CONFIG.plotsCount }, (_, i) => ({
    id: i,
    state: "empty",
    plantTimestamp: 0,
    lastWaterTime: 0,
    waterCount: 0,
    totalCyclesNeeded: 0,
    currentGracePeriod: 0,
    isFertilized: false,
  })),
  lastDailyBonus: 0,
  tutorialStep: 1, // Start with tutorial
  monthlyProfit: 0,
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Game Loop (Tick)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const newPlots = prev.plots.map((plot) => {
          if (plot.state === "empty" || plot.state === "dead" || plot.state === "ready") {
            return plot;
          }

          if (!plot.plantId) return plot;
          const plantType = PLANT_TYPES[plot.plantId];

          // Time since last water (or planting)
          const timeSinceWater = now - plot.lastWaterTime;

          // Check if it should become thirsty
          // It becomes thirsty after 'wateringInterval'
          if (plot.state === "growing" && timeSinceWater >= plantType.wateringInterval) {
            return { ...plot, state: "thirsty" };
          }

          // Check if it died
          // It dies if thirsty + gracePeriod passed
          // Effective time since it became thirsty = timeSinceWater - wateringInterval
          if (plot.state === "thirsty") {
            const timeThirsty = timeSinceWater - plantType.wateringInterval;
            if (timeThirsty >= plot.currentGracePeriod) {
              return { ...plot, state: "dead" };
            }
          }

          return plot;
        });

        // Only update if something changed to avoid re-renders if strict equality check fails (though map always returns new array)
        // Optimization: check deep equality or just trust React
        return { ...prev, plots: newPlots };
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const buySeed = (plantId: string) => {
    const plant = PLANT_TYPES[plantId];
    if (state.diamonds >= plant.seedCost) {
      setState((prev) => ({
        ...prev,
        diamonds: prev.diamonds - plant.seedCost,
        inventory: {
          ...prev.inventory,
          [plantId]: (prev.inventory[plantId] || 0) + 1,
        },
        tutorialStep: prev.tutorialStep === 2 ? 3 : prev.tutorialStep,
      }));
      toast({ title: "Purchase Successful", description: `Bought ${plant.name} seed!` });
    } else {
      toast({ title: "Insufficient Funds", description: "Need more Diamonds!", variant: "destructive" });
    }
  };

  const plantSeed = (plotId: number, plantId: string) => {
    const plant = PLANT_TYPES[plantId];
    if ((state.inventory[plantId] || 0) > 0) {
      setState((prev) => {
        const newPlots = [...prev.plots];
        // Calculate random grace period
        const grace = Math.floor(
          Math.random() * (plant.gracePeriodMax - plant.gracePeriodMin + 1) + plant.gracePeriodMin
        );

        newPlots[plotId] = {
          ...newPlots[plotId],
          state: "growing", // Starts healthy
          plantId,
          plantTimestamp: Date.now(),
          lastWaterTime: Date.now(), // Planting counts as "wet" / healthy start
          waterCount: 0,
          totalCyclesNeeded: plant.totalWaterCycles,
          currentGracePeriod: grace,
          isFertilized: false,
        };

        return {
          ...prev,
          inventory: {
            ...prev.inventory,
            [plantId]: prev.inventory[plantId] - 1,
          },
          tutorialStep: prev.tutorialStep === 3 ? 0 : prev.tutorialStep, // End tutorial
          plots: newPlots,
        };
      });
      toast({ title: "Planted!", description: `${plant.name} is now growing.` });
    }
  };

  const waterPlant = (plotId: number) => {
    if (state.diamonds < GAME_CONFIG.waterCost) {
      toast({ title: "No Water!", description: "You need 1 Diamond to water.", variant: "destructive" });
      return;
    }

    setState((prev) => {
      const newPlots = [...prev.plots];
      const plot = newPlots[plotId];
      if (!plot.plantId) return prev;

      const newWaterCount = plot.waterCount + 1;
      const isReady = newWaterCount >= plot.totalCyclesNeeded;

      newPlots[plotId] = {
        ...plot,
        state: isReady ? "ready" : "growing",
        lastWaterTime: Date.now(),
        waterCount: newWaterCount,
      };

      return {
        ...prev,
        diamonds: prev.diamonds - GAME_CONFIG.waterCost,
        plots: newPlots,
      };
    });
    toast({ title: "Watered!", description: "Plant is healthy again." });
  };

  const fertilizePlant = (plotId: number) => {
    if (state.bng < GAME_CONFIG.fertilizerCost) {
      toast({ title: "Not enough B&G!", description: "Need 500 B&G for fertilizer.", variant: "destructive" });
      return;
    }

    setState((prev) => {
      const newPlots = [...prev.plots];
      const plot = newPlots[plotId];

      if (plot.isFertilized) return prev; // Already fertilized

      const newTotal = Math.floor(plot.totalCyclesNeeded * (1 - GAME_CONFIG.fertilizerReduction));

      // If reducing cycles makes it ready instantly (unlikely but possible logic)
      const isReady = plot.waterCount >= newTotal;

      newPlots[plotId] = {
        ...plot,
        totalCyclesNeeded: newTotal,
        isFertilized: true,
        state: isReady ? "ready" : plot.state,
      };

      return {
        ...prev,
        bng: prev.bng - GAME_CONFIG.fertilizerCost,
        plots: newPlots,
      };
    });
    toast({ title: "Fertilized!", description: "Growth cycles reduced!" });
  };

  const harvestPlant = (plotId: number) => {
    setState((prev) => {
      const plot = prev.plots[plotId];
      if (!plot.plantId) return prev;

      const plant = PLANT_TYPES[plot.plantId];
      const diamondReward = plant.seedCost * 2;
      // Random B&G reward
      // Min/Max not specified in spec per plant, using generic logic or assuming logic based on "Growth Factor"
      // "BG_Reward = Random(Min, Max) * Growth_Factor."
      // Let's assume generic 50-100 base * difficulty multiplier maybe?
      // Or just a range. Let's say 20-50 for Daisy, 50-100 Rose, 200-500 Orchid.
      // Implementing simple random range for now: 2x to 5x seed cost in B&G?
      // Spec says "Random Range based on growth time".
      // Let's use Seed Cost * Random(2, 5).
      const bngReward = Math.floor(plant.seedCost * (Math.random() * 3 + 2));

      const newPlots = [...prev.plots];
      newPlots[plotId] = {
        ...INITIAL_STATE.plots[plotId], // Reset to empty
        id: plotId,
      };

      return {
        ...prev,
        diamonds: prev.diamonds + diamondReward,
        bng: prev.bng + bngReward,
        monthlyProfit: prev.monthlyProfit + (diamondReward - plant.seedCost), // Profit logic (ignoring water cost for simple metric or track strictly?)
        // "Monthly Diamond Profit". Strict profit = Reward - Seed - Water.
        // I'll stick to simple "Net Gain from Harvest" for now, or track expenses.
        // Let's do Revenue - SeedCost. (Water cost is sunk).
        plots: newPlots,
      };
    });
    toast({ title: "Harvested!", description: "Rewards added to wallet." });
  };

  const clearDeadPlant = (plotId: number) => {
    setState((prev) => {
      const plot = prev.plots[plotId];
      if (!plot.plantId) return prev;

      const plant = PLANT_TYPES[plot.plantId];

      const newPlots = [...prev.plots];
      newPlots[plotId] = {
        ...INITIAL_STATE.plots[plotId],
        id: plotId,
      };

      return {
        ...prev,
        diamonds: prev.diamonds + plant.seedCost, // Refund
        plots: newPlots,
      };
    });
    toast({ title: "Plant Cleared", description: `Refunded ${PLANT_TYPES[prev.plots[plotId].plantId!].seedCost} Diamonds.` });
  };

  const claimDailyBonus = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - state.lastDailyBonus > oneDay) {
      setState((prev) => ({
        ...prev,
        bng: prev.bng + GAME_CONFIG.dailyBonusBnG,
        lastDailyBonus: now,
      }));
      toast({ title: "Daily Bonus!", description: `Received ${GAME_CONFIG.dailyBonusBnG} B&G Coins.` });
    }
  };

  const setTutorialStep = (step: number) => {
      setState(prev => ({ ...prev, tutorialStep: step }));
  };

  return (
    <GameContext.Provider
      value={{
        state,
        buySeed,
        plantSeed,
        waterPlant,
        fertilizePlant,
        harvestPlant,
        clearDeadPlant,
        claimDailyBonus,
        setTutorialStep
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
