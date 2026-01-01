
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
    name: "Wheat",
    emoji: "🌾",
    seedCost: 5,
    totalWaterCycles: 3,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 6 * 60 * 60 * 1000,
    gracePeriodMax: 14 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "Ideal for beginners. Low risk, quick harvest.",
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    emoji: "🥕",
    seedCost: 8,
    totalWaterCycles: 4,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 5 * 60 * 60 * 1000,
    gracePeriodMax: 12 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "Grows underground. Requires patience but worth it.",
  },
  corn: {
    id: "corn",
    name: "Corn",
    emoji: "🌽",
    seedCost: 15,
    totalWaterCycles: 5,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 5 * 60 * 60 * 1000,
    gracePeriodMax: 11 * 60 * 60 * 1000,
    difficulty: "Easy",
    description: "A popular crop. Provides balanced earnings.",
  },
  potato: {
    id: "potato",
    name: "Potato",
    emoji: "🥔",
    seedCost: 20,
    totalWaterCycles: 6,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 10 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Underground treasure. Medium difficulty, good returns.",
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    emoji: "🍅",
    seedCost: 30,
    totalWaterCycles: 7,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 9 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Red gold! Requires careful watering.",
  },
  pepper: {
    id: "pepper",
    name: "Pepper",
    emoji: "🌶️",
    seedCost: 40,
    totalWaterCycles: 8,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 4 * 60 * 60 * 1000,
    gracePeriodMax: 8 * 60 * 60 * 1000,
    difficulty: "Medium",
    description: "Spicy profits! For experienced farmers.",
  },
  eggplant: {
    id: "eggplant",
    name: "Eggplant",
    emoji: "🍆",
    seedCost: 60,
    totalWaterCycles: 10,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 3 * 60 * 60 * 1000,
    gracePeriodMax: 8 * 60 * 60 * 1000,
    difficulty: "Hard",
    description: "Purple riches. High risk, high reward.",
  },
  pumpkin: {
    id: "pumpkin",
    name: "Pumpkin",
    emoji: "🎃",
    seedCost: 100,
    totalWaterCycles: 12,
    wateringInterval: 24 * 60 * 60 * 1000,
    gracePeriodMin: 3 * 60 * 60 * 1000,
    gracePeriodMax: 7 * 60 * 60 * 1000,
    difficulty: "Hard",
    description: "Giant harvest! Hardest but most profitable crop.",
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

// Barn Card Game Configuration
export interface BarnAnimal {
  id: string;
  name: string;
  emoji: string;
}

export const BARN_ANIMALS: BarnAnimal[] = [
  { id: "cow", name: "Cow", emoji: "🐄" },
  { id: "pig", name: "Pig", emoji: "🐷" },
  { id: "chicken", name: "Chicken", emoji: "🐔" },
  { id: "sheep", name: "Sheep", emoji: "🐑" },
  { id: "horse", name: "Horse", emoji: "🐴" },
  { id: "duck", name: "Duck", emoji: "🦆" },
  { id: "goat", name: "Goat", emoji: "🐐" },
  { id: "rabbit", name: "Rabbit", emoji: "🐰" },
  { id: "rooster", name: "Rooster", emoji: "🐓" },
  { id: "turkey", name: "Turkey", emoji: "🦃" },
];

export const BARN_CONFIG = {
  matchReward: 500, // B&G coins per successful match
  totalAttempts: 10, // Number of pair flip attempts allowed
  totalPairs: 10, // Number of animal pairs (20 cards total)
  cooldownDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  // Purchase config for instant refill
  purchase: {
    priceWLD: "0.1", // Price in WLD to refill attempts
    priceUSDC: "0.25", // Price in USDC to refill attempts
    attemptsGranted: 10, // Attempts granted on purchase
  },
};
