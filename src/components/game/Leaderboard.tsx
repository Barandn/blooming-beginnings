import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { Loader2 } from "lucide-react";
import { getLeaderboard, LeaderboardEntry as APILeaderboardEntry } from "@/lib/minikit/api";

// Types for Leaderboard
interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  monthlyProfit: number;
  gamesPlayed: number;
  isCurrentUser: boolean;
}

interface UserStats {
  rank: number | null;
  monthlyProfit: number;
  gamesPlayed: number;
}

const Leaderboard = () => {
  const { user } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getLeaderboard(undefined, 50, 0, true);

        if (response.status === 'success' && response.data) {
          const data = response.data;

          // Map API entries to our format
          const leaderboardEntries: LeaderboardEntry[] = data.entries.map((entry: APILeaderboardEntry) => ({
            rank: entry.rank,
            walletAddress: entry.walletAddress,
            monthlyProfit: entry.monthlyProfit,
            gamesPlayed: entry.gamesPlayed,
            isCurrentUser: false, // Will be set below if user data matches
          }));

          setEntries(leaderboardEntries);

          // Set user stats if available
          if (data.user) {
            setUserStats({
              rank: data.user.rank,
              monthlyProfit: data.user.monthlyProfit,
              gamesPlayed: data.user.gamesPlayed,
            });

            // Mark current user in entries
            setEntries(prev => prev.map(entry => ({
              ...entry,
              isCurrentUser: entry.rank === data.user?.rank,
            })));
          }
        } else {
          setError(response.error || 'Failed to load leaderboard');
        }
      } catch (e) {
        console.error('Leaderboard fetch error:', e);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user.monthlyScore]);

  // Format Month
  const date = new Date();
  const monthName = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  return (
    <div className="flex flex-col items-center p-4 min-h-[70vh] w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">World League</h1>
        <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold mt-2 inline-block shadow-lg">
          {monthName} '{year.toString().slice(2)} Season
        </div>
      </div>

      <div className="w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-1 p-3 border-b border-white/10 text-xs font-bold text-white/50 uppercase">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-3 text-center">Score</div>
          <div className="col-span-3 text-right">Games</div>
        </div>

        {/* List */}
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-blue-400 underline text-sm"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-white/50">
            <p>No players yet this season.</p>
            <p className="text-sm mt-1">Be the first to play!</p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={`grid grid-cols-12 gap-1 p-3 border-b border-white/5 items-center ${
                  entry.isCurrentUser ? "bg-blue-500/20" : ""
                }`}
              >
                <div className="col-span-1 text-center font-bold text-white text-sm">
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                </div>
                <div className="col-span-5 font-mono text-xs text-white/90 truncate">
                  {entry.walletAddress}
                </div>
                <div className="col-span-3 text-center font-bold text-blue-400 text-sm">
                  {entry.monthlyProfit.toLocaleString()}
                </div>
                <div className="col-span-3 text-right font-mono text-blue-300 text-xs">
                  {entry.gamesPlayed}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current User Stats */}
      <div className="mt-4 w-full bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-xl border border-blue-500/30 flex justify-between items-center shadow-lg">
        <div>
          <p className="text-xs text-blue-300 uppercase">Your Season Score</p>
          <p className="text-xl font-bold text-white">
            {userStats?.monthlyProfit?.toLocaleString() || user.monthlyScore.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-300 uppercase">Rank</p>
          <p className="text-xl font-bold text-white">
            {userStats?.rank ? `#${userStats.rank}` : '--'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
