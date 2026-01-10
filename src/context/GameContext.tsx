import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import {
  submitScore,
  isAuthenticated,
  getUserData,
  getBarnGameStatus,
  useFreeGame,
  claimDailyBonus as claimDailyBonusAPI,
  BarnGameStatusResponse,
  startBarnGame
} from "@/lib/minikit/api";

// --- Game Types ---

export interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
  isBonus?: boolean; // Bonus card (starts matched)
}

export interface GameSession {
  cards: Card[];
  flippedCards: number[]; // IDs of currently flipped cards (max 2)
  matchedPairs: number;
  score: number;
  moves: number;
  gameStartedAt: number; // Timestamp
  elapsedTime: number; // Elapsed time in milliseconds
  remainingTime: number; // Remaining time in milliseconds (countdown from 90s)
  isComplete: boolean;
  isTimeOut: boolean; // True if player ran out of time
}

export interface UserState {
  id: string; // Wallet Address or Nullifier Hash
  coins: number;
  streakCount: number;
  lastLoginDate: string | null;
  monthlyScore: number;
  inventory: Record<string, number>;
}

// Barn Game Status State
export interface BarnGameState {
  hasActivePass: boolean;
  playPassExpiresAt: number | null;
  playPassRemainingMs: number;
  isInCooldown: boolean;
  cooldownEndsAt: number | null;
  cooldownRemainingMs: number;
  freeGameAvailable: boolean;
  canPlay: boolean;
  purchasePrice: { WLD: string } | null;
  isLoading: boolean;
  // Lives system
  lives: number;
  nextLifeAt: number | null;
  nextLifeInMs: number;
}

const INITIAL_BARN_STATE: BarnGameState = {
  hasActivePass: false,
  playPassExpiresAt: null,
  playPassRemainingMs: 0,
  isInCooldown: false,
  cooldownEndsAt: null,
  cooldownRemainingMs: 0,
  freeGameAvailable: true,
  canPlay: true,
  purchasePrice: null,
  isLoading: true,
  lives: 5,
  nextLifeAt: null,
  nextLifeInMs: 0,
};

interface GameContextType {
  user: UserState;
  game: GameSession;
  barnStatus: BarnGameState;
  startGame: () => Promise<void>;
  flipCard: (cardId: number) => void;
  claimDailyBonus: () => Promise<void>;
  resetGame: () => void;
  refreshBarnStatus: () => Promise<void>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// --- Constants ---

// 15 emojis for 15 pairs (30 cards) = 5x6 grid
const FOOTBALL_EMOJIS = ["⚽", "🏆", "🥅", "🧤", "🏟️", "🟨", "🟥", "👟", "🎯", "🏅", "⚡", "🔥", "🎖️", "🏃", "💪"];
const GAME_PAIRS = 15; // 5x6 grid (30 cards)
const TIME_LIMIT = 90000; // 90 seconds in milliseconds

const INITIAL_GAME: GameSession = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  score: 0,
  moves: 0,
  gameStartedAt: 0,
  elapsedTime: 0,
  remainingTime: TIME_LIMIT,
  isComplete: false,
  isTimeOut: false,
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

  // Create 15 pairs (30 cards)
  FOOTBALL_EMOJIS.forEach((emoji, index) => {
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
  const [barnStatus, setBarnStatus] = useState<BarnGameState>(INITIAL_BARN_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to track if win has been processed to prevent double rewards
  const winProcessedRef = useRef(false);

  // Timer ref for interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Barn Game Status ---
  const refreshBarnStatus = useCallback(async () => {
    if (!isAuthenticated()) {
      // Guest mode - allow playing without restrictions
      setBarnStatus({
        ...INITIAL_BARN_STATE,
        isLoading: false,
      });
      return;
    }

    setBarnStatus(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await getBarnGameStatus();

      if (response.status === 'success' && response.data) {
        const data = response.data;
        setBarnStatus({
          hasActivePass: data.hasActivePass,
          playPassExpiresAt: data.playPassExpiresAt,
          playPassRemainingMs: data.playPassRemainingMs,
          isInCooldown: data.isInCooldown,
          cooldownEndsAt: data.cooldownEndsAt,
          cooldownRemainingMs: data.cooldownRemainingMs,
          freeGameAvailable: data.freeGameAvailable,
          canPlay: data.canPlay,
          purchasePrice: data.purchasePrice,
          isLoading: false,
          lives: data.lives || 5,
          nextLifeAt: data.nextLifeAt || null,
          nextLifeInMs: data.nextLifeInMs || 0,
        });
      } else {
        // API error - allow playing as fallback
        setBarnStatus({
          ...INITIAL_BARN_STATE,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch barn status:', error);
      setBarnStatus({
        ...INITIAL_BARN_STATE,
        isLoading: false,
      });
    }
  }, []);

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
        // Load barn game status for authenticated users
        await refreshBarnStatus();
      } else {
        const savedUser = localStorage.getItem("siuu_user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // Keep default user
          }
        }
        // Guest mode - set barn status to allow playing
        setBarnStatus({
          ...INITIAL_BARN_STATE,
          isLoading: false,
        });
      }
      setIsLoading(false);
    };

    initUser();
  }, [refreshBarnStatus]);

  // Persist User State
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("siuu_user", JSON.stringify(user));
    }
  }, [user, isLoading]);

  // --- Game Logic ---

  const startGame = useCallback(async () => {
    // If authenticated, consume a life via API
    if (isAuthenticated()) {
      try {
        const result = await startBarnGame();

        if (result.status === 'error') {
          toast({
            title: "Cannot Start Game",
            description: result.error || "You have no lives remaining. Lives regenerate every 6 hours.",
            variant: "destructive",
          });
          return;
        }

        // Update barn status with new lives count
        if (result.data) {
          setBarnStatus(prev => ({
            ...prev,
            lives: result.data!.livesRemaining,
            nextLifeAt: result.data!.nextLifeAt,
            nextLifeInMs: result.data!.nextLifeAt ? result.data!.nextLifeAt - Date.now() : 0,
          }));
        }
      } catch (error) {
        console.error('Failed to start game:', error);
        toast({
          title: "Error",
          description: "Failed to start game. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    winProcessedRef.current = false;
    setGame({
      ...INITIAL_GAME,
      cards: createDeck(),
      gameStartedAt: Date.now(),
      remainingTime: TIME_LIMIT,
    });
  }, []);

  const resetGame = useCallback(async () => {
    winProcessedRef.current = false;
    setGame(INITIAL_GAME);
    // Refresh barn status when resetting game
    if (isAuthenticated()) {
      await refreshBarnStatus();
    }
  }, [refreshBarnStatus]);

  const flipCard = useCallback((cardId: number) => {
    setGame(prev => {
      // Guard clauses
      if (prev.isComplete) return prev;
      if (prev.isTimeOut) return prev;
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

  // Timer effect - updates elapsed time and remaining time every 10ms
  useEffect(() => {
    if (game.gameStartedAt > 0 && !game.isComplete && !game.isTimeOut) {
      timerRef.current = setInterval(() => {
        setGame(prev => {
          const elapsed = Date.now() - prev.gameStartedAt;
          const remaining = Math.max(0, TIME_LIMIT - elapsed);

          // Check if time has run out
          if (remaining <= 0) {
            return {
              ...prev,
              elapsedTime: elapsed,
              remainingTime: 0,
              isTimeOut: true,
            };
          }

          return {
            ...prev,
            elapsedTime: elapsed,
            remainingTime: remaining,
          };
        });
      }, 10);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game.gameStartedAt, game.isComplete, game.isTimeOut]);

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
        validationData: { moves: game.moves, elapsedTime: game.elapsedTime },
      });
    }
  }, [game.gameStartedAt, game.moves, game.elapsedTime, user.monthlyScore]);

  // Watch for Win
  useEffect(() => {
    if (!game.isComplete && game.matchedPairs === GAME_PAIRS && game.matchedPairs > 0) {
      setGame(prev => ({ ...prev, isComplete: true }));
      handleWin();
    }
  }, [game.matchedPairs, game.isComplete, handleWin]);

  // --- Daily Bonus ---
  const claimDailyBonus = useCallback(async () => {
    // If authenticated, use backend API (DB-driven)
    if (isAuthenticated()) {
      try {
        const result = await claimDailyBonusAPI();

        if (result.success) {
          // Streak is now tracked in DB, update local state from result
          const streakDay = result.streakDay || 1;
          const today = getTodayString();

          setUser(u => ({
            ...u,
            streakCount: streakDay,
            lastLoginDate: today,
          }));

          toast({
            title: `Day ${streakDay} Bonus!`,
            description: `${result.amount} tokens claimed! TX: ${result.txHash?.slice(0, 10)}...`,
          });
        } else {
          console.error('Daily bonus claim failed:', result.error);
          toast({
            title: "Bonus Claim Failed",
            description: result.error || "Please try again later.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Daily bonus claim error:', error);
        toast({
          title: "Bonus Claim Error",
          description: "Network error. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // Guest mode - local only (not DB tracked)
    const today = getTodayString();
    const last = user.lastLoginDate;
    
    // Already claimed today locally
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
    barnStatus,
    startGame,
    flipCard,
    claimDailyBonus,
    resetGame,
    refreshBarnStatus,
    isLoading,
  }), [user, game, barnStatus, startGame, flipCard, claimDailyBonus, resetGame, refreshBarnStatus, isLoading]);

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
