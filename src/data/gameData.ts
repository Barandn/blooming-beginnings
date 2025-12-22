
export interface FlowerSpecies {
  id: string;
  name: string;
  seedCost: number; // Diamonds
  waterCycles: number; // Total cycles needed to harvest
  wateringInterval: number; // Hours (fixed at 24h per spec)
  gracePeriodMin: number; // Hours
  gracePeriodMax: number; // Hours
  difficulty: 'Easy' | 'Medium' | 'Hard';
  specialTrait: string;
  icon: string; // Emoji or image placeholder
}

export const FLOWER_TYPES: FlowerSpecies[] = [
  {
    id: 'daisy',
    name: 'Papatya (Daisy)',
    seedCost: 10,
    waterCycles: 4,
    wateringInterval: 24,
    gracePeriodMin: 4,
    gracePeriodMax: 12,
    difficulty: 'Easy',
    specialTrait: 'Ideal for beginners. Low risk.',
    icon: '🌼'
  },
  {
    id: 'rose',
    name: 'Gül (Rose)',
    seedCost: 25,
    waterCycles: 8,
    wateringInterval: 24,
    gracePeriodMin: 4,
    gracePeriodMax: 10,
    difficulty: 'Medium',
    specialTrait: 'Balanced ROI. Standard choice.',
    icon: '🌹'
  },
  {
    id: 'orchid',
    name: 'Orkide (Orchid)',
    seedCost: 100,
    waterCycles: 12,
    wateringInterval: 24,
    gracePeriodMin: 4,
    gracePeriodMax: 8,
    difficulty: 'Hard',
    specialTrait: 'High risk, massive reward. Fast withering.',
    icon: '🌺'
  }
];

export const ECONOMY = {
  STARTING_DIAMONDS: 50,
  STARTING_BG: 200, // Daily bonus start
  WATER_COST: 1, // Diamond
  FERTILIZER_COST: 500, // B&G
  FERTILIZER_EFFICIENCY: 0.25, // Reduces cycles by 25%
  HARVEST_DIAMOND_MULTIPLIER: 2, // Seed Cost * 2
  BG_REWARD_MIN: 50,
  BG_REWARD_MAX: 150,
};
