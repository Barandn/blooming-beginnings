// Card Match Game Configuration
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
