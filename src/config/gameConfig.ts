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
  totalPairs: 10, // Number of animal pairs (20 cards total)

  // Play Pass System
  playPassDuration: 1 * 60 * 60 * 1000, // 1 hour unlimited play in milliseconds
  cooldownDuration: 12 * 60 * 60 * 1000, // 12 hours cooldown in milliseconds

  // Purchase config for Play Pass
  purchase: {
    priceWLD: "1", // 1 WLD for 1 hour Play Pass
  },
};
