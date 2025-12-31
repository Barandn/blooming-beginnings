import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { GAME_CONFIG, PLANT_TYPES, PlantType, BARN_ANIMALS, BARN_CONFIG } from "@/config/gameConfig";
import { toast } from "@/hooks/use-toast";
import { submitScore, isAuthenticated } from "@/lib/minikit/api";

export type PlotState = "empty" | "growing" | "thirsty" | "dead" | "ready";

// Barn Card Game Types
export interface BarnCard {
  id: number;
  animalId: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface BarnGameState {
  cards: BarnCard[];
  flippedCards: number[]; // IDs of currently flipped cards (max 2)
  matchedPairs: number;
  attemptsUsed: number;
  lastPlayedDate: string; // ISO date string (YYYY-MM-DD)
  hasPlayedToday: boolean;
  totalCoinsWon: number;
  // Cooldown system
  cooldownEndsAt: number | null; // Timestamp when cooldown ends (null if no cooldown)
  isInCooldown: boolean;
}

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
  barnGame: BarnGameState; // Card matching game state
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
  // Barn game actions
  flipBarnCard: (cardId: number) => void;
  startBarnGame: () => void;
  checkBarnDailyReset: () => void;
  resetBarnAttempts: () => void; // Reset attempts after purchase
  getCooldownRemaining: () => number; // Get remaining cooldown in ms
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = "grand_master_farm_save_v1";

// Helper function to get today's date as YYYY-MM-DD
const getTodayDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Helper function to create shuffled barn cards
const createBarnCards = (): BarnCard[] => {
  const cards: BarnCard[] = [];

  // Create pairs for each animal
  BARN_ANIMALS.forEach((animal, index) => {
    // First card of pair
    cards.push({
      id: index * 2,
      animalId: animal.id,
      emoji: animal.emoji,
      isFlipped: false,
      isMatched: false,
    });
    // Second card of pair
    cards.push({
      id: index * 2 + 1,
      animalId: animal.id,
      emoji: animal.emoji,
      isFlipped: false,
      isMatched: false,
    });
  });

  // Shuffle using Fisher-Yates algorithm
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Reassign IDs after shuffle to maintain uniqueness
  return cards.map((card, index) => ({ ...card, id: index }));
};

const INITIAL_BARN_STATE: BarnGameState = {
  cards: createBarnCards(),
  flippedCards: [],
  matchedPairs: 0,
  attemptsUsed: 0,
  lastPlayedDate: "",
  hasPlayedToday: false,
  totalCoinsWon: 0,
  cooldownEndsAt: null,
  isInCooldown: false,
};

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
  barnGame: INITIAL_BARN_STATE,
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure barnGame exists with all required properties for backwards compatibility
      return {
        ...INITIAL_STATE,
        ...parsed,
        barnGame: {
          ...INITIAL_BARN_STATE,
          ...parsed.barnGame,
        },
        // Ensure plots have correct PlotState type
        plots: (parsed.plots || INITIAL_STATE.plots).map((plot: PlotData) => ({
          ...plot,
          state: plot.state as PlotState,
        })),
      };
    }
    return INITIAL_STATE;
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
        const newPlots: PlotData[] = prev.plots.map((plot) => {
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
            return { ...plot, state: "thirsty" as PlotState };
          }

          // Check if it died
          // It dies if thirsty + gracePeriod passed
          // Effective time since it became thirsty = timeSinceWater - wateringInterval
          if (plot.state === "thirsty") {
            const timeThirsty = timeSinceWater - plantType.wateringInterval;
            if (timeThirsty >= plot.currentGracePeriod) {
              return { ...plot, state: "dead" as PlotState };
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
      toast({ title: "Satın Alma Başarılı!", description: `${plant.name} tohumu alındı!` });
    } else {
      toast({ title: "Yetersiz Bakiye", description: "Daha fazla Elmas gerekli!", variant: "destructive" });
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
      toast({ title: "Ekildi!", description: `${plant.name} şimdi büyüyor.` });
    }
  };

  const waterPlant = (plotId: number) => {
    if (state.diamonds < GAME_CONFIG.waterCost) {
      toast({ title: "Su Yok!", description: "Sulamak için 1 Elmas gerekli.", variant: "destructive" });
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
    toast({ title: "Sulandı!", description: "Mahsul tekrar sağlıklı." });
  };

  const fertilizePlant = (plotId: number) => {
    if (state.bng < GAME_CONFIG.fertilizerCost) {
      toast({ title: "Yetersiz B&G!", description: "Gübre için 500 B&G gerekli.", variant: "destructive" });
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
    toast({ title: "Gübrelendi!", description: "Büyüme süresi azaldı!" });
  };

  const harvestPlant = (plotId: number) => {
    const plot = state.plots[plotId];
    if (!plot.plantId) return;

    const plant = PLANT_TYPES[plot.plantId];
    const diamondReward = plant.seedCost * 2;
    const bngReward = Math.floor(plant.seedCost * (Math.random() * 3 + 2));
    const profit = diamondReward - plant.seedCost;
    const newMonthlyProfit = state.monthlyProfit + profit;

    setState((prev) => {
      const newPlots = [...prev.plots];
      newPlots[plotId] = {
        ...INITIAL_STATE.plots[plotId],
        id: plotId,
      };

      return {
        ...prev,
        diamonds: prev.diamonds + diamondReward,
        bng: prev.bng + bngReward,
        monthlyProfit: newMonthlyProfit,
        plots: newPlots,
      };
    });

    toast({ title: "Hasat Edildi!", description: "Ödüller cüzdanına eklendi." });

    // Submit score to backend if authenticated
    if (isAuthenticated()) {
      submitScore({
        gameType: 'harvest',
        score: diamondReward,
        monthlyProfit: newMonthlyProfit,
        gameStartedAt: plot.plantTimestamp,
        gameEndedAt: Date.now(),
        validationData: {
          plantId: plot.plantId,
          waterCount: plot.waterCount,
          plotId: plotId,
        },
      }).catch((err) => {
        console.error('Failed to submit harvest score:', err);
      });
    }
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
    toast({ title: "Mahsul Temizlendi", description: `${PLANT_TYPES[state.plots[plotId].plantId!].seedCost} Elmas iade edildi.` });
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
      toast({ title: "Günlük Bonus!", description: `${GAME_CONFIG.dailyBonusBnG} B&G Coin kazanıldı.` });
    }
  };

  const setTutorialStep = (step: number) => {
      setState(prev => ({ ...prev, tutorialStep: step }));
  };

  // Barn Game Actions
  const checkBarnDailyReset = useCallback(() => {
    const now = Date.now();
    setState((prev) => {
      const { barnGame } = prev;

      // Check if cooldown has expired
      if (barnGame.isInCooldown && barnGame.cooldownEndsAt && now >= barnGame.cooldownEndsAt) {
        // Cooldown expired - reset game
        return {
          ...prev,
          barnGame: {
            ...INITIAL_BARN_STATE,
            cards: createBarnCards(),
            lastPlayedDate: "",
            hasPlayedToday: false,
            totalCoinsWon: 0,
            cooldownEndsAt: null,
            isInCooldown: false,
          },
        };
      }

      return prev;
    });
  }, []);

  // Get remaining cooldown time in milliseconds
  const getCooldownRemaining = useCallback((): number => {
    const { barnGame } = state;
    if (!barnGame.isInCooldown || !barnGame.cooldownEndsAt) {
      return 0;
    }
    const remaining = barnGame.cooldownEndsAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [state.barnGame.cooldownEndsAt, state.barnGame.isInCooldown]);

  // Reset attempts after purchase
  const resetBarnAttempts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      barnGame: {
        ...INITIAL_BARN_STATE,
        cards: createBarnCards(),
        lastPlayedDate: "",
        hasPlayedToday: false,
        totalCoinsWon: 0,
        cooldownEndsAt: null,
        isInCooldown: false,
      },
    }));
    toast({
      title: "Haklar Yenilendi!",
      description: "10 yeni eşleştirme hakkın var. İyi şanslar!",
    });
  }, []);

  const startBarnGame = () => {
    const today = getTodayDateString();
    setState((prev) => {
      // Check if already played today
      if (prev.barnGame.lastPlayedDate === today && prev.barnGame.hasPlayedToday) {
        return prev; // Already played
      }

      return {
        ...prev,
        barnGame: {
          ...INITIAL_BARN_STATE,
          cards: createBarnCards(),
          flippedCards: [],
          matchedPairs: 0,
          attemptsUsed: 0,
          lastPlayedDate: today,
          hasPlayedToday: false,
          totalCoinsWon: 0,
        },
      };
    });
  };

  const flipBarnCard = (cardId: number) => {
    setState((prev) => {
      const { barnGame } = prev;

      // Check if in cooldown
      if (barnGame.isInCooldown) {
        return prev;
      }

      // Check if game is over (all attempts used or all matched)
      if (barnGame.attemptsUsed >= BARN_CONFIG.totalAttempts || barnGame.matchedPairs >= BARN_CONFIG.totalPairs) {
        return prev;
      }

      // Check if this card is already flipped or matched
      const card = barnGame.cards.find((c) => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) {
        return prev;
      }

      // Check if already have 2 cards flipped
      if (barnGame.flippedCards.length >= 2) {
        return prev;
      }

      // Flip the card
      const newCards = barnGame.cards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c
      );

      const newFlippedCards = [...barnGame.flippedCards, cardId];

      // If this is the second card flipped, check for match
      if (newFlippedCards.length === 2) {
        const [firstId, secondId] = newFlippedCards;
        const firstCard = newCards.find((c) => c.id === firstId)!;
        const secondCard = newCards.find((c) => c.id === secondId)!;

        const isMatch = firstCard.animalId === secondCard.animalId;

        if (isMatch) {
          // Mark cards as matched
          const matchedCards = newCards.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          );

          const newMatchedPairs = barnGame.matchedPairs + 1;
          const newAttemptsUsed = barnGame.attemptsUsed + 1;
          const newTotalCoinsWon = barnGame.totalCoinsWon + BARN_CONFIG.matchReward;
          const isGameComplete = newMatchedPairs >= BARN_CONFIG.totalPairs || newAttemptsUsed >= BARN_CONFIG.totalAttempts;

          // Start cooldown if game is complete
          const cooldownEndsAt = isGameComplete ? Date.now() + BARN_CONFIG.cooldownDuration : null;

          // Add reward
          toast({
            title: "Eşleşme!",
            description: `+${BARN_CONFIG.matchReward} B&G Coin kazandın!`,
          });

          // Submit barn game score to backend when game completes
          if (isGameComplete && isAuthenticated()) {
            const gameStartTime = barnGame.lastPlayedDate
              ? new Date(barnGame.lastPlayedDate).getTime()
              : Date.now() - 60000;

            submitScore({
              gameType: 'barn_game',
              score: newTotalCoinsWon,
              monthlyProfit: prev.monthlyProfit,
              gameStartedAt: gameStartTime,
              gameEndedAt: Date.now(),
              validationData: {
                matchedPairs: newMatchedPairs,
                attemptsUsed: newAttemptsUsed,
                totalPairs: BARN_CONFIG.totalPairs,
              },
            }).catch((err) => {
              console.error('Failed to submit barn game score:', err);
            });
          }

          return {
            ...prev,
            bng: prev.bng + BARN_CONFIG.matchReward,
            barnGame: {
              ...barnGame,
              cards: matchedCards,
              flippedCards: [],
              matchedPairs: newMatchedPairs,
              attemptsUsed: newAttemptsUsed,
              hasPlayedToday: isGameComplete,
              totalCoinsWon: newTotalCoinsWon,
              cooldownEndsAt,
              isInCooldown: isGameComplete,
            },
          };
        } else {
          // No match - cards will flip back (handled by setTimeout in component)
          const newAttemptsUsed = barnGame.attemptsUsed + 1;
          const isGameComplete = newAttemptsUsed >= BARN_CONFIG.totalAttempts;

          // Start cooldown if game is complete
          const cooldownEndsAt = isGameComplete ? Date.now() + BARN_CONFIG.cooldownDuration : null;

          // Submit barn game score to backend when game completes (no more attempts)
          if (isGameComplete && isAuthenticated()) {
            const gameStartTime = barnGame.lastPlayedDate
              ? new Date(barnGame.lastPlayedDate).getTime()
              : Date.now() - 60000;

            submitScore({
              gameType: 'barn_game',
              score: barnGame.totalCoinsWon,
              monthlyProfit: prev.monthlyProfit,
              gameStartedAt: gameStartTime,
              gameEndedAt: Date.now(),
              validationData: {
                matchedPairs: barnGame.matchedPairs,
                attemptsUsed: newAttemptsUsed,
                totalPairs: BARN_CONFIG.totalPairs,
              },
            }).catch((err) => {
              console.error('Failed to submit barn game score:', err);
            });
          }

          // We'll flip back in the component after a delay
          return {
            ...prev,
            barnGame: {
              ...barnGame,
              cards: newCards,
              flippedCards: newFlippedCards,
              attemptsUsed: newAttemptsUsed,
              hasPlayedToday: isGameComplete,
              cooldownEndsAt,
              isInCooldown: isGameComplete,
            },
          };
        }
      }

      // First card flipped
      return {
        ...prev,
        barnGame: {
          ...barnGame,
          cards: newCards,
          flippedCards: newFlippedCards,
        },
      };
    });
  };

  // Helper to flip cards back after a mismatch (called from component)
  const flipCardsBack = useCallback(() => {
    setState((prev) => {
      const { barnGame } = prev;
      const newCards = barnGame.cards.map((c) =>
        barnGame.flippedCards.includes(c.id) && !c.isMatched
          ? { ...c, isFlipped: false }
          : c
      );

      return {
        ...prev,
        barnGame: {
          ...barnGame,
          cards: newCards,
          flippedCards: [],
        },
      };
    });
  }, []);

  // Effect to flip cards back after mismatch
  useEffect(() => {
    const { flippedCards, cards } = state.barnGame;
    if (flippedCards.length === 2) {
      const [firstId, secondId] = flippedCards;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      // If not matched, flip back after delay
      if (firstCard && secondCard && firstCard.animalId !== secondCard.animalId) {
        const timer = setTimeout(flipCardsBack, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.barnGame.flippedCards, flipCardsBack]);

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
        setTutorialStep,
        flipBarnCard,
        startBarnGame,
        checkBarnDailyReset,
        resetBarnAttempts,
        getCooldownRemaining,
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
