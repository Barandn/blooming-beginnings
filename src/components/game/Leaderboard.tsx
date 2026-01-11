import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { getLeaderboard, getUserLeaderboard, LeaderboardEntry as ApiLeaderboardEntry } from "@/lib/minikit/api";

// Calculate reward based on rank
const getReward = (rank: number): number => {
  if (rank === 1) return 20;
  if (rank === 2) return 15;
  if (rank === 3) return 10;
  if (rank >= 4 && rank <= 10) return 5;
  if (rank >= 11 && rank <= 20) return 2;
  return 0;
};

// Extended entry type for UI
interface LeaderboardUIEntry extends ApiLeaderboardEntry {
  isCurrentUser: boolean;
}

const Leaderboard = () => {
  const { user: gameUser } = useGame();
  const { user: authUser, isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<LeaderboardUIEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<{ moves: number; timeTaken: number; gamesPlayed: number } | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch main leaderboard
      const response = await getLeaderboard(undefined, 50, 0, true);
      
      if (response.status !== 'success' || !response.data) {
        setError(response.error || 'Leaderboard could not be loaded');
        setEntries([]);
        return;
      }

      const { entries: apiEntries, pagination } = response.data;
      
      // Map entries and mark current user
      const currentWallet = authUser?.walletAddress?.toLowerCase();
      const mappedEntries: LeaderboardUIEntry[] = apiEntries.map(entry => ({
        ...entry,
        isCurrentUser: currentWallet ? entry.walletAddress.toLowerCase().includes(currentWallet.slice(2, 6)) : false,
      }));

      setEntries(mappedEntries);
      setTotalPlayers(pagination.total);

      // Fetch user-specific data if authenticated
      if (isAuthenticated) {
        const userResponse = await getUserLeaderboard();
        if (userResponse.status === 'success' && userResponse.data) {
          setUserRank(userResponse.data.rank);
          if (userResponse.data.entry) {
            setUserStats({
              moves: userResponse.data.stats?.cardMatchBestScore || 0,
              timeTaken: 0,
              gamesPlayed: userResponse.data.entry.gamesPlayed,
            });
          }
        }
      }

    } catch (e) {
      console.error('Leaderboard fetch error:', e);
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [gameUser.monthlyScore, isAuthenticated]);

  // Format Month
  const date = new Date();
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();

  return (
    <div className="flex flex-col items-center p-4 min-h-[70vh] w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">World League</h1>
        <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold mt-2 inline-block shadow-lg">
          {monthName} '{year.toString().slice(2)} Season
        </div>
      </div>

      {/* Market Cap Rewards Notice */}
      <div className="w-full mb-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 rounded-xl p-3 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">🚀</span>
          <p className="text-white text-sm font-bold text-center">
            When SIUUU Coin reaches $80,000 USD market cap, rewards will be doubled!
          </p>
          <span className="text-2xl">💰</span>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchLeaderboard}
        disabled={loading}
        className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>

      {/* Error State */}
      {error && (
        <div className="w-full mb-4 bg-red-500/20 border border-red-500/40 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-1 p-3 border-b border-white/10 text-xs font-bold text-white/50 uppercase">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Player</div>
          <div className="col-span-2 text-center">Moves</div>
          <div className="col-span-3 text-center">Time</div>
          <div className="col-span-2 text-center">Reward</div>
        </div>

        {/* List */}
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            <p className="text-white/50 text-sm">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/50 text-sm">No scores yet. Be the first!</p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            {entries.map((entry) => {
              const reward = getReward(entry.rank);
              return (
                <div
                  key={`${entry.rank}-${entry.walletAddress}`}
                  className={`grid grid-cols-12 gap-1 p-3 border-b border-white/5 items-center ${
                    entry.isCurrentUser ? "bg-blue-500/20 border-l-2 border-l-blue-500" : ""
                  }`}
                >
                  <div className="col-span-1 text-center font-bold text-white text-sm">
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                  </div>
                  <div className="col-span-4 font-mono text-xs text-white/90 truncate">
                    {entry.walletAddress}
                    {entry.isCurrentUser && <span className="ml-1 text-blue-400">(You)</span>}
                  </div>
                  <div className="col-span-2 text-center font-bold text-green-400 text-sm">
                    {entry.moves}
                  </div>
                  <div className="col-span-3 text-center font-mono text-blue-300 text-xs">
                    {entry.formattedTime}
                  </div>
                  <div className="col-span-2 text-center">
                    {reward > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full shadow-lg">
                        {reward} WLD
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total Players Count */}
      {totalPlayers > 0 && (
        <p className="mt-2 text-white/40 text-xs">
          Total {totalPlayers} players
        </p>
      )}

      {/* Current User Stats */}
      <div className="mt-4 w-full bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-xl border border-blue-500/30 flex justify-between items-center shadow-lg">
        <div>
          <p className="text-xs text-blue-300 uppercase">Best Moves</p>
          <p className="text-xl font-bold text-white">
            {userStats?.moves || '--'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-300 uppercase">Your Rank</p>
          <p className="text-xl font-bold text-white">
            {userRank ? `#${userRank}` : '--'}
          </p>
        </div>
      </div>

      {/* Games Played */}
      {userStats && (
        <div className="mt-2 text-center">
          <p className="text-white/50 text-xs">
            You played {userStats.gamesPlayed} games this season
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
