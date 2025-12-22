
export interface PlantType {
  id: string;
  name: string;
  emoji: string;
  seedCost: number; // Diamonds
  totalWaterCycles: number;
  wateringInterval: number; // Milliseconds (24h)
  gracePeriodMin: number; // Milliseconds (4h)
  gracePeriodMax: number; // Milliseconds (12h)
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
}

export const PLANT_TYPES: Record<string, PlantType> = {
  daisy: {
    id: "daisy",
    name: "Papatya (Daisy)",
    emoji: "🌼",
    seedCost: 10,
    totalWaterCycles: 4,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 12 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "Ideal for beginners. Low risk.",
  },
  rose: {
    id: "rose",
    name: "Gül (Rose)",
    emoji: "🌹",
    seedCost: 25,
    totalWaterCycles: 8,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 10 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Balanced ROI. Standard choice.",
  },
  orchid: {
    id: "orchid",
    name: "Orkide (Orchid)",
    emoji: "🪷",
    seedCost: 100,
    totalWaterCycles: 12,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 8 * 60 * 60 * 1000,
    difficulty: "Hard",
    description: "High risk, massive reward. Fast withering.",
  },
};

export const GAME_CONFIG = {
  waterCost: 1, // Diamond
  fertilizerCost: 500, // B&G
  fertilizerReduction: 0.25, // 25%
  startingDiamonds: 50,
  startingBnG: 0,
  dailyBonusBnG: 200,
  plotsCount: 9,
};
