
export interface CropType {
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

// Backward compatibility alias
export type PlantType = CropType;

export const CROP_TYPES: Record<string, CropType> = {
  wheat: {
    id: "wheat",
    name: "Buğday (Wheat)",
    emoji: "🌾",
    seedCost: 5,
    totalWaterCycles: 3,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 6 * 60 * 60 * 1000,
    gracePeriodMax: 14 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "Yeni başlayanlar için ideal. Düşük risk, hızlı hasat.",
  },
  carrot: {
    id: "carrot",
    name: "Havuç (Carrot)",
    emoji: "🥕",
    seedCost: 8,
    totalWaterCycles: 4,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 5 * 60 * 60 * 1000,
    gracePeriodMax: 12 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "Toprak altında yetişir. Sabır ister ama değer.",
  },
  corn: {
    id: "corn",
    name: "Mısır (Corn)",
    emoji: "🌽",
    seedCost: 15,
    totalWaterCycles: 5,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 5 * 60 * 60 * 1000,
    gracePeriodMax: 11 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "Popüler bir mahsul. Dengeli kazanç sağlar.",
  },
  potato: {
    id: "potato",
    name: "Patates (Potato)",
    emoji: "🥔",
    seedCost: 20,
    totalWaterCycles: 6,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 10 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Toprak altı hazinesi. Orta zorluk, iyi getiri.",
  },
  tomato: {
    id: "tomato",
    name: "Domates (Tomato)",
    emoji: "🍅",
    seedCost: 30,
    totalWaterCycles: 7,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 9 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Kırmızı altın! Dikkatli sulama gerektirir.",
  },
  pepper: {
    id: "pepper",
    name: "Biber (Pepper)",
    emoji: "🌶️",
    seedCost: 40,
    totalWaterCycles: 8,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 8 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Acı kazanç! Tecrübeli çiftçiler için.",
  },
  eggplant: {
    id: "eggplant",
    name: "Patlıcan (Eggplant)",
    emoji: "🍆",
    seedCost: 60,
    totalWaterCycles: 10,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 3 * 60 * 60 * 1000,
    gracePeriodMax: 8 * 60 * 60 * 1000,
    difficulty: "Hard",
    description: "Mor zenginlik. Yüksek risk, yüksek ödül.",
  },
  pumpkin: {
    id: "pumpkin",
    name: "Kabak (Pumpkin)",
    emoji: "🎃",
    seedCost: 100,
    totalWaterCycles: 12,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 3 * 60 * 60 * 1000,
    gracePeriodMax: 7 * 60 * 60 * 1000,
    difficulty: "Hard",
    description: "Dev hasat! En zor ama en kazançlı mahsul.",
  },
};

// Backward compatibility alias
export const PLANT_TYPES = CROP_TYPES;

export const GAME_CONFIG = {
  waterCost: 1, // Diamond
  fertilizerCost: 500, // B&G
  fertilizerReduction: 0.25, // 25%
  startingDiamonds: 50,
  startingBnG: 0,
  dailyBonusBnG: 200,
  plotsCount: 9,
};
