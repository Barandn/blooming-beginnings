import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { submitScore, isAuthenticated, getUserData } from "@/lib/minikit/api";
import { supabase } from "@/integrations/supabase/client";

// --- Game Types ---

export interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface GameSession {
  cards: Card[];
  flippedCards: number[]; // IDs of currently flipped cards (max 2)
  matchedPairs: number;
  score: number;
  moves: number;
  gameStartedAt: number; // Timestamp
  isComplete: boolean;
}

export interface UserState {
  id: string; // Wallet Address or Nullifier Hash
  coins: number;
  streakCount: number;
  lastLoginDate: string | null;
  monthlyScore: number;
  inventory: Record<string, number>; // For compatibility if needed
}

interface GameContextType {
  user: UserState;
  game: GameSession;
  startGame: () => void;
  flipCard: (cardId: number) => void;
  claimDailyBonus: () => Promise<void>;
  resetGame: () => void;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// --- Constants ---

const FOOTBALL_EMOJIS = ["⚽", "🏆", "🥅", "🧤", "🏟️", "🟨", "🟥", "👟"];
const GAME_PAIRS = 8; // 4x4 grid

const INITIAL_GAME: GameSession = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  score: 0,
  moves: 0,
  gameStartedAt: 0,
  isComplete: false,
};

const INITIAL_USER: UserState = {
  id: "guest",
  coins: 0,
  streakCount: 0,
  lastLoginDate: null,
  monthlyScore: 0,
  inventory: {},
};

// --- Helper Functions ---

const createDeck = (): Card[] => {
  const cards: Card[] = [];
  FOOTBALL_EMOJIS.forEach((emoji, index) => {
    // Pair 1
    cards.push({ id: index * 2, emoji, isFlipped: false, isMatched: false });
    // Pair 2
    cards.push({ id: index * 2 + 1, emoji, isFlipped: false, isMatched: false });
  });

  // Shuffle (Fisher-Yates)
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Re-index for safety
  return cards.map((c, i) => ({ ...c, id: i }));
};

const getTodayString = () => new Date().toISOString().split('T')[0];

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [game, setGame] = useState<GameSession>(INITIAL_GAME);
  const [isLoading, setIsLoading] = useState(true);

  // --- Initialization ---
  useEffect(() => {
    const initUser = async () => {
      setIsLoading(true);
      // Try to get user from MiniKit or LocalStorage or Mock
      // In a real scenario, we verify wallet, then fetch from Supabase

      const userData = getUserData(); // Mock function from minikit/api

      // Simulate fetching from DB
      if (isAuthenticated()) {
         // TODO: Fetch real data from Supabase using userData.walletAddress
         // For now, load from localStorage or default
         const savedUser = localStorage.getItem("siuu_user");
         if (savedUser) {
             setUser(JSON.parse(savedUser));
         } else {
             setUser(prev => ({ ...prev, id: userData?.walletAddress || "guest" }));
         }
      } else {
         const savedUser = localStorage.getItem("siuu_user");
         if (savedUser) setUser(JSON.parse(savedUser));
      }
      setIsLoading(false);
    };

    initUser();
  }, []);

  // Persist User State
  useEffect(() => {
    localStorage.setItem("siuu_user", JSON.stringify(user));
  }, [user]);

  // --- Game Logic ---

  const startGame = () => {
    setGame({
      ...INITIAL_GAME,
      cards: createDeck(),
      gameStartedAt: Date.now(),
    });
  };

  const resetGame = () => {
      setGame(INITIAL_GAME);
  }

  const flipCard = useCallback((cardId: number) => {
    setGame(prev => {
      if (prev.isComplete) return prev;
      if (prev.flippedCards.length >= 2) return prev;

      const card = prev.cards.find(c => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) return prev;

      const newFlipped = [...prev.flippedCards, cardId];
      const newCards = prev.cards.map(c => c.id === cardId ? { ...c, isFlipped: true } : c);

      // Check Match
      if (newFlipped.length === 2) {
        const c1 = newCards.find(c => c.id === newFlipped[0])!;
        const c2 = newCards.find(c => c.id === newFlipped[1])!;

        if (c1.emoji === c2.emoji) {
           // Match!
           const matchedCards = newCards.map(c =>
             (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true, isFlipped: true } : c
           );
           const newPairs = prev.matchedPairs + 1;
           const isWin = newPairs === GAME_PAIRS;

           // We cannot call side effect (handleWin) directly in state setter
           // We'll handle it in an effect or check in render, but for now
           // we can defer it or assume the state update triggers an effect.

           // Correct pattern: Update state, and use useEffect to detect completion
           // OR: Return state that indicates pending win, then effect.

           // However, to keep it simple and avoid massive refactor of this block:
           // We will just mark isComplete here if win, but 'handleWin' does more logic (DB call).
           // Let's refactor handleWin to be called via Effect.

           return {
               ...prev,
               cards: matchedCards,
               flippedCards: [],
               matchedPairs: newPairs,
               moves: prev.moves + 1
           };
        } else {
            // No Match - handled by effect to flip back
            return {
                ...prev,
                cards: newCards,
                flippedCards: newFlipped,
                moves: prev.moves + 1
            };
        }
      }

      return {
          ...prev,
          cards: newCards,
          flippedCards: newFlipped
      };
    });
  }, []);

  // Effect to flip back unmatched cards
  useEffect(() => {
      if (game.flippedCards.length === 2) {
          const timer = setTimeout(() => {
              setGame(prev => {
                  if (prev.flippedCards.length !== 2) return prev; // Safety
                  // Check if they are matched (already handled in flipCard, but if we are here, they weren't matched immediately or we need to reset flipped status if not matched)

                  // Re-check logic: flipCard marks them matched immediately if match.
                  // If we are here and they are NOT matched in the state, we must flip them back.
                  const c1 = prev.cards.find(c => c.id === prev.flippedCards[0]);

                  if (c1?.isMatched) return { ...prev, flippedCards: [] }; // They were matched, just clear flipped array

                  // Flip back
                  const newCards = prev.cards.map(c =>
                      prev.flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c
                  );
                  return { ...prev, cards: newCards, flippedCards: [] };
              });
          }, 1000);
          return () => clearTimeout(timer);
      }
  }, [game.flippedCards]);

  const handleWin = useCallback(() => {
      const bonus = 100; // Fixed win bonus

      setUser(u => {
          // Prevent double awarding if state update is slow or effect fires twice
          // But since handleWin is called from Effect dependent on matchedPairs...
          // We need to be careful.
          // Actually, let's just do the DB call and toast here.
          // State update for coins is fine.

          return { ...u, coins: u.coins + bonus, monthlyScore: u.monthlyScore + bonus };
      });

      // Mark game as fully complete/processed if needed, or just rely on 'isComplete' from game state

      toast({
          title: "SİUUUU!",
          description: `You won ${bonus} Coins!`,
      });

      if (isAuthenticated()) {
          submitScore({
              gameType: "card_match",
              score: bonus,
              monthlyProfit: user.monthlyScore + bonus,
              gameStartedAt: game.gameStartedAt,
              gameEndedAt: Date.now(),
              validationData: { moves: game.moves }
          });
      }
  }, [game.gameStartedAt, game.moves, user.monthlyScore]); // Add dependencies

  // Watch for Win Condition
  useEffect(() => {
      if (!game.isComplete && game.matchedPairs === GAME_PAIRS && game.matchedPairs > 0) {
          setGame(prev => ({ ...prev, isComplete: true }));
          handleWin();
      }
  }, [game.matchedPairs, game.isComplete, handleWin]);

  // --- Daily Bonus Logic ---

  const claimDailyBonus = async () => {
    const today = getTodayString();
    const last = user.lastLoginDate;

    if (last === today) return; // Already claimed

    let newStreak = 1;
    if (last) {
        const lastDate = new Date(last);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (last === yesterdayStr) {
            newStreak = (user.streakCount % 7) + 1;
        } else {
            newStreak = 1; // Reset
        }
    }

    const reward = newStreak === 7 ? 1000 : 100;

    setUser(u => ({
        ...u,
        coins: u.coins + reward,
        streakCount: newStreak,
        lastLoginDate: today
    }));

    toast({
        title: `Day ${newStreak} Bonus!`,
        description: `You collected ${reward} Coins!`,
    });

    // Save to DB
    if (isAuthenticated()) {
        // We would call an API here to update users table
        // For now, rely on local state syncing via effect or future implementation
    }
  };

  return (
    <GameContext.Provider value={{ user, game, startGame, flipCard, claimDailyBonus, resetGame, isLoading }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
