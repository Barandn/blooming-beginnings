import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import {
  submitScore,
  isAuthenticated,
  getUserData,
  getBarnGameStatus,
  useFreeGame,
  claimDailyBonus as claimDailyBonusAPI,
  BarnGameStatusResponse
} from "@/lib/minikit/api";

// --- Game Types ---

export interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Booster Types
export type BoosterType = 'mirror' | 'magnet' | 'hourglass' | 'moves';

export interface BoosterInfo {
  id: BoosterType;
  name: string;
  description: string;
  icon: string;
  price: number;
}

export interface BoosterState {
  purchased: boolean;
  used: boolean;
}

export interface GameBoosters {
  mirror: BoosterState;
  magnet: BoosterState;
  hourglass: BoosterState;
  moves: BoosterState;
}

// Booster Effect States
export interface BoosterEffects {
  mirrorActive: boolean;
  magnetActive: boolean;
  hourglassActive: boolean;
  movesActive: boolean;
}

export const BOOSTER_INFO: Record<BoosterType, BoosterInfo> = {
  mirror: {
    id: 'mirror',
    name: 'Ayna',
    description: '1 saniye tüm kartları göster',
    icon: '🪞',
    price: 50,
  },
  magnet: {
    id: 'magnet',
    name: 'Mıknatıs',
    description: '2 kartı otomatik eşleştir',
    icon: '🧲',
    price: 75,
  },
  hourglass: {
    id: 'hourglass',
    name: 'Kum Saati',
    description: '+10 saniye süre ekle',
    icon: '⏳',
    price: 40,
  },
  moves: {
    id: 'moves',
    name: 'Silgi',
    description: '5 hamleyi sil',
    icon: '✨',
    price: 30,
  },
};

const INITIAL_BOOSTERS: GameBoosters = {
  mirror: { purchased: false, used: false },
  magnet: { purchased: false, used: false },
  hourglass: { purchased: false, used: false },
  moves: { purchased: false, used: false },
};

const INITIAL_EFFECTS: BoosterEffects = {
  mirrorActive: false,
  magnetActive: false,
  hourglassActive: false,
  movesActive: false,
};

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
  boosters: GameBoosters;
  boosterEffects: BoosterEffects;
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
  // Booster functions
  purchaseBooster: (boosterType: BoosterType) => boolean;
  activateBooster: (boosterType: BoosterType) => boolean;
  canPurchaseBooster: (boosterType: BoosterType) => boolean;
  canUseBooster: (boosterType: BoosterType) => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// --- Constants ---

const FOOTBALL_EMOJIS = ["⚽", "🏆", "🥅", "🧤", "🏟️", "🟨", "🟥", "👟"];
const GAME_PAIRS = 8; // 4x4 grid
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
  boosters: INITIAL_BOOSTERS,
  boosterEffects: INITIAL_EFFECTS,
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

  // Bonus time ref for hourglass booster
  const bonusTimeRef = useRef<number>(0);

  // --- Game Logic ---

  const startGame = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Guest mode - allow playing without restrictions
      winProcessedRef.current = false;
      bonusTimeRef.current = 0;
      setGame(prev => ({
        ...INITIAL_GAME,
        cards: createDeck(),
        gameStartedAt: Date.now(),
        remainingTime: TIME_LIMIT,
        boosters: {
          mirror: { purchased: prev.boosters.mirror.purchased, used: false },
          magnet: { purchased: prev.boosters.magnet.purchased, used: false },
          hourglass: { purchased: prev.boosters.hourglass.purchased, used: false },
          moves: { purchased: prev.boosters.moves.purchased, used: false },
        },
        boosterEffects: INITIAL_EFFECTS,
      }));
      return;
    }

    // Unlimited play mode - bypass all checks
    winProcessedRef.current = false;
    bonusTimeRef.current = 0;
    setGame(prev => ({
      ...INITIAL_GAME,
      cards: createDeck(),
      gameStartedAt: Date.now(),
      remainingTime: TIME_LIMIT,
      boosters: {
        mirror: { purchased: prev.boosters.mirror.purchased, used: false },
        magnet: { purchased: prev.boosters.magnet.purchased, used: false },
        hourglass: { purchased: prev.boosters.hourglass.purchased, used: false },
        moves: { purchased: prev.boosters.moves.purchased, used: false },
      },
      boosterEffects: INITIAL_EFFECTS,
    }));
    return;


  }, [barnStatus, refreshBarnStatus]);

  const resetGame = useCallback(async () => {
    winProcessedRef.current = false;
    bonusTimeRef.current = 0;
    setGame(INITIAL_GAME);
    // Refresh barn status when resetting game
    if (isAuthenticated()) {
      await refreshBarnStatus();
    }
  }, [refreshBarnStatus]);

  // --- Booster Logic ---

  const canPurchaseBooster = useCallback((boosterType: BoosterType): boolean => {
    // Can only purchase before game starts
    if (game.gameStartedAt > 0) return false;
    // Already purchased
    if (game.boosters[boosterType].purchased) return false;
    // Not enough coins
    if (user.coins < BOOSTER_INFO[boosterType].price) return false;
    return true;
  }, [game.gameStartedAt, game.boosters, user.coins]);

  const purchaseBooster = useCallback((boosterType: BoosterType): boolean => {
    if (!canPurchaseBooster(boosterType)) return false;

    const price = BOOSTER_INFO[boosterType].price;

    setUser(prev => ({
      ...prev,
      coins: prev.coins - price,
    }));

    setGame(prev => ({
      ...prev,
      boosters: {
        ...prev.boosters,
        [boosterType]: { purchased: true, used: false },
      },
    }));

    toast({
      title: `${BOOSTER_INFO[boosterType].icon} ${BOOSTER_INFO[boosterType].name}`,
      description: "Booster satın alındı!",
    });

    return true;
  }, [canPurchaseBooster]);

  const canUseBooster = useCallback((boosterType: BoosterType): boolean => {
    // Game must be active
    if (game.gameStartedAt === 0) return false;
    if (game.isComplete || game.isTimeOut) return false;
    // Must be purchased and not used
    if (!game.boosters[boosterType].purchased) return false;
    if (game.boosters[boosterType].used) return false;
    // Check if any booster effect is currently active
    if (game.boosterEffects.mirrorActive || game.boosterEffects.magnetActive) return false;
    // For moves booster, must have at least 1 move
    if (boosterType === 'moves' && game.moves < 1) return false;
    // For magnet booster, must have at least 1 unmatched pair
    if (boosterType === 'magnet' && game.matchedPairs >= GAME_PAIRS) return false;
    return true;
  }, [game]);

  const activateBooster = useCallback((boosterType: BoosterType): boolean => {
    if (!canUseBooster(boosterType)) return false;

    // Mark as used and activate effect
    setGame(prev => ({
      ...prev,
      boosters: {
        ...prev.boosters,
        [boosterType]: { ...prev.boosters[boosterType], used: true },
      },
      boosterEffects: {
        ...prev.boosterEffects,
        [`${boosterType}Active`]: true,
      },
    }));

    // Handle each booster type
    switch (boosterType) {
      case 'mirror':
        // Show all cards for 1 second (handled in UI component)
        setTimeout(() => {
          setGame(prev => ({
            ...prev,
            boosterEffects: { ...prev.boosterEffects, mirrorActive: false },
          }));
        }, 1000);
        break;

      case 'magnet':
        // Auto-match one pair
        setTimeout(() => {
          setGame(prev => {
            // Find unmatched pairs
            const unmatchedCards = prev.cards.filter(c => !c.isMatched);
            if (unmatchedCards.length < 2) {
              return { ...prev, boosterEffects: { ...prev.boosterEffects, magnetActive: false } };
            }

            // Find a pair to match
            const emojiGroups: Record<string, Card[]> = {};
            unmatchedCards.forEach(card => {
              if (!emojiGroups[card.emoji]) {
                emojiGroups[card.emoji] = [];
              }
              emojiGroups[card.emoji].push(card);
            });

            // Get first available pair
            const pairEmoji = Object.keys(emojiGroups).find(emoji => emojiGroups[emoji].length >= 2);
            if (!pairEmoji) {
              return { ...prev, boosterEffects: { ...prev.boosterEffects, magnetActive: false } };
            }

            const [card1, card2] = emojiGroups[pairEmoji];

            // Match the pair
            const newCards = prev.cards.map(c => {
              if (c.id === card1.id || c.id === card2.id) {
                return { ...c, isFlipped: true, isMatched: true };
              }
              return c;
            });

            return {
              ...prev,
              cards: newCards,
              matchedPairs: prev.matchedPairs + 1,
              boosterEffects: { ...prev.boosterEffects, magnetActive: false },
            };
          });
        }, 600);
        break;

      case 'hourglass':
        // Add 10 seconds
        bonusTimeRef.current += 10000;
        setTimeout(() => {
          setGame(prev => ({
            ...prev,
            boosterEffects: { ...prev.boosterEffects, hourglassActive: false },
          }));
        }, 1000);
        break;

      case 'moves':
        // Remove 5 moves
        setGame(prev => ({
          ...prev,
          moves: Math.max(0, prev.moves - 5),
          boosterEffects: { ...prev.boosterEffects, movesActive: false },
        }));
        break;
    }

    return true;
  }, [canUseBooster]);

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
          // Include bonus time from hourglass booster
          const totalTimeLimit = TIME_LIMIT + bonusTimeRef.current;
          const remaining = Math.max(0, totalTimeLimit - elapsed);

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
    // Booster functions
    purchaseBooster,
    activateBooster,
    canPurchaseBooster,
    canUseBooster,
  }), [user, game, barnStatus, startGame, flipCard, claimDailyBonus, resetGame, refreshBarnStatus, isLoading, purchaseBooster, activateBooster, canPurchaseBooster, canUseBooster]);

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
