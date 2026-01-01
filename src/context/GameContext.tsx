import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { submitScore, isAuthenticated, getUserData } from "@/lib/minikit/api";

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
  inventory: Record<string, number>;
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
    // Create pairs
    cards.push({ id: index * 2, emoji, isFlipped: false, isMatched: false });
    cards.push({ id: index * 2 + 1, emoji, isFlipped: false, isMatched: false });
  });

  // Fisher-Yates Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Re-index for stable keys
  return cards.map((c, i) => ({ ...c, id: i }));
};

const getTodayString = () => new Date().toISOString().split('T')[0];

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [game, setGame] = useState<GameSession>(INITIAL_GAME);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to track if win has been processed to prevent double rewards
  const winProcessedRef = useRef(false);

  // --- Initialization ---
  useEffect(() => {
    const initUser = async () => {
      setIsLoading(true);

      const userData = getUserData();

      if (isAuthenticated()) {
        const savedUser = localStorage.getItem("siuu_user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            setUser(prev => ({ ...prev, id: userData?.walletAddress || "guest" }));
          }
        } else {
          setUser(prev => ({ ...prev, id: userData?.walletAddress || "guest" }));
        }
      } else {
        const savedUser = localStorage.getItem("siuu_user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // Keep default user
          }
        }
      }
      setIsLoading(false);
    };

    initUser();
  }, []);

  // Persist User State
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("siuu_user", JSON.stringify(user));
    }
  }, [user, isLoading]);

  // --- Game Logic ---

  const startGame = useCallback(() => {
    winProcessedRef.current = false;
    setGame({
      ...INITIAL_GAME,
      cards: createDeck(),
      gameStartedAt: Date.now(),
    });
  }, []);

  const resetGame = useCallback(() => {
    winProcessedRef.current = false;
    setGame(INITIAL_GAME);
  }, []);

  const flipCard = useCallback((cardId: number) => {
    setGame(prev => {
      // Guard clauses
      if (prev.isComplete) return prev;
      if (prev.flippedCards.length >= 2) return prev;

      const cardIndex = prev.cards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return prev;

      const card = prev.cards[cardIndex];
      if (card.isFlipped || card.isMatched) return prev;

      // Flip the card
      const newCards = [...prev.cards];
      newCards[cardIndex] = { ...card, isFlipped: true };

      const newFlipped = [...prev.flippedCards, cardId];

      // If this is the second card
      if (newFlipped.length === 2) {
        const firstCardIndex = newCards.findIndex(c => c.id === newFlipped[0]);
        const firstCard = newCards[firstCardIndex];

        // Check for match
        if (firstCard.emoji === card.emoji) {
          // Match found!
          newCards[firstCardIndex] = { ...firstCard, isMatched: true };
          newCards[cardIndex] = { ...newCards[cardIndex], isMatched: true };

          const newMatchedPairs = prev.matchedPairs + 1;

          return {
            ...prev,
            cards: newCards,
            flippedCards: [],
            matchedPairs: newMatchedPairs,
            moves: prev.moves + 1,
          };
        } else {
          // No match - will be flipped back by effect
          return {
            ...prev,
            cards: newCards,
            flippedCards: newFlipped,
            moves: prev.moves + 1,
          };
        }
      }

      // First card flip - no move count yet
      return {
        ...prev,
        cards: newCards,
        flippedCards: newFlipped,
      };
    });
  }, []);

  // Flip back unmatched cards
  useEffect(() => {
    if (game.flippedCards.length === 2) {
      const timer = setTimeout(() => {
        setGame(prev => {
          if (prev.flippedCards.length !== 2) return prev;

          // Check if first card is matched (they both would be if one is)
          const firstCard = prev.cards.find(c => c.id === prev.flippedCards[0]);
          if (firstCard?.isMatched) {
            return { ...prev, flippedCards: [] };
          }

          // Flip cards back
          const newCards = prev.cards.map(c =>
            prev.flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c
          );

          return { ...prev, cards: newCards, flippedCards: [] };
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [game.flippedCards]);

  // Handle Win
  const handleWin = useCallback(() => {
    if (winProcessedRef.current) return;
    winProcessedRef.current = true;

    const bonus = 100;

    setUser(u => ({
      ...u,
      coins: u.coins + bonus,
      monthlyScore: u.monthlyScore + bonus,
    }));

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
        validationData: { moves: game.moves },
      });
    }
  }, [game.gameStartedAt, game.moves, user.monthlyScore]);

  // Watch for Win
  useEffect(() => {
    if (!game.isComplete && game.matchedPairs === GAME_PAIRS && game.matchedPairs > 0) {
      setGame(prev => ({ ...prev, isComplete: true }));
      handleWin();
    }
  }, [game.matchedPairs, game.isComplete, handleWin]);

  // --- Daily Bonus ---
  const claimDailyBonus = useCallback(async () => {
    const today = getTodayString();
    const last = user.lastLoginDate;

    if (last === today) return;

    let newStreak = 1;
    if (last) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (last === yesterdayStr) {
        newStreak = (user.streakCount % 7) + 1;
      }
    }

    const reward = newStreak === 7 ? 1000 : 100;

    setUser(u => ({
      ...u,
      coins: u.coins + reward,
      streakCount: newStreak,
      lastLoginDate: today,
    }));

    toast({
      title: `Day ${newStreak} Bonus!`,
      description: `You collected ${reward} Coins!`,
    });
  }, [user.lastLoginDate, user.streakCount]);

  // Memoize context value
  const contextValue = useMemo(() => ({
    user,
    game,
    startGame,
    flipCard,
    claimDailyBonus,
    resetGame,
    isLoading,
  }), [user, game, startGame, flipCard, claimDailyBonus, resetGame, isLoading]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
