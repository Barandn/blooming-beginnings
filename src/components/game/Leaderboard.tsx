import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, TrendingUp, Loader2, RefreshCw, Users } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { getLeaderboard, getUserLeaderboard, type LeaderboardEntry, type LeaderboardResponse } from "@/lib/minikit/api";
import { isAuthenticated } from "@/lib/minikit/api";

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

// Note: Backend already masks wallet addresses for privacy
// Format: 0x1234...5678

const Leaderboard = ({ isOpen, onClose }: LeaderboardProps) => {
  const { state } = useGame();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch main leaderboard
      const result = await getLeaderboard(undefined, 100, 0, true);

      if (result.status === 'success' && result.data) {
        setLeaderboardData(result.data);

        // If user data is included in response, use it
        if (result.data.user) {
          setUserRank(result.data.user.rank);
        }
      } else {
        setError(result.error || 'Failed to load leaderboard');
      }

      // If authenticated, also fetch user-specific rank
      if (isAuthenticated()) {
        const userResult = await getUserLeaderboard();
        if (userResult.status === 'success' && userResult.data) {
          setUserRank(userResult.data.rank);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, fetchLeaderboard]);

  const entries = leaderboardData?.entries || [];
  const stats = leaderboardData?.stats;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl text-amber-800">
            <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Top Farmers
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {/* User Stats */}
          <div className="flex justify-between items-center px-4 py-2 bg-amber-50 rounded-lg mb-2 border border-amber-100">
            <span className="font-bold text-amber-900">Your Monthly Earnings:</span>
            <div className="flex items-center gap-1 font-mono text-lg font-bold text-green-600">
              <TrendingUp className="w-4 h-4" />
              {state.monthlyProfit} 💎
            </div>
          </div>

          {/* User Rank */}
          {userRank !== null && (
            <div className="flex justify-between items-center px-4 py-2 bg-blue-50 rounded-lg mb-4 border border-blue-100">
              <span className="font-bold text-blue-900">Your Rank:</span>
              <span className="font-mono text-lg font-bold text-blue-600">#{userRank}</span>
            </div>
          )}

          {/* Stats Summary */}
          {stats && (
            <div className="flex justify-center gap-4 mb-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{stats.totalPlayers} players</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                <span>{stats.totalGames} games</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-sm text-red-500 text-center">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-800 text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Trophy className="w-12 h-12 text-gray-300" />
              <p className="text-sm text-gray-500 text-center">
                No one on the leaderboard yet.<br />
                Be the first!
              </p>
            </div>
          )}

          {/* Leaderboard List */}
          {!isLoading && !error && entries.length > 0 && (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {entries.map((user: LeaderboardEntry) => (
                  <div
                    key={`${user.rank}-${user.walletAddress}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      user.rank <= 3
                        ? "bg-gradient-to-r from-yellow-50 to-white border-yellow-200"
                        : "bg-white border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        user.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                        user.rank === 2 ? "bg-gray-300 text-gray-800" :
                        user.rank === 3 ? "bg-amber-600 text-amber-100" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {user.rank}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-medium text-sm ${user.rank <= 3 ? "text-amber-900" : "text-gray-700"}`}>
                          {user.walletAddress}
                        </span>
                        <span className="text-xs text-gray-400">
                          {user.gamesPlayed} games
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">
                      {user.monthlyProfit} 💎
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Refresh Button */}
          {!isLoading && !error && entries.length > 0 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={fetchLeaderboard}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-amber-600 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Leaderboard;
