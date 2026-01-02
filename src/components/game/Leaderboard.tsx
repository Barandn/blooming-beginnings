import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { Loader2 } from "lucide-react";
import { getLeaderboard, getUserLeaderboard } from "@/lib/minikit/api";

// Types for Leaderboard
interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  monthlyProfit: number;
  totalScore: number;
  gamesPlayed: number;
}

// WLD Rewards for top 8 positions
const getWldReward = (rank: number): number | null => {
  switch (rank) {
    case 1: return 40;
    case 2: return 30;
    case 3: return 20;
    case 4:
    case 5:
    case 6:
    case 7:
    case 8: return 10;
    default: return null;
  }
};

const Leaderboard = () => {
  const { user } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      const fetchLeaderboard = async () => {
          setLoading(true);
          setError(null);
          try {
              // Fetch leaderboard from real API
              const response = await getLeaderboard(undefined, 10, 0, true);

              if (response.status === 'success' && response.data) {
                  const leaderboardEntries: LeaderboardEntry[] = response.data.entries.map((entry) => ({
                      rank: entry.rank,
                      walletAddress: entry.walletAddress,
                      monthlyProfit: entry.monthlyProfit,
                      totalScore: entry.totalScore,
                      gamesPlayed: entry.gamesPlayed,
                  }));
                  setEntries(leaderboardEntries);

                  // Get user's rank if available
                  if (response.data.user?.rank) {
                      setUserRank(response.data.user.rank);
                  }
              } else {
                  setError(response.error || 'Failed to load leaderboard');
              }
          } catch (e) {
              console.error('Leaderboard fetch error:', e);
              setError('Network error - please try again');
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

       {/* Top 3 Podium (Optional visual, kept simple list for now as per "List top users" req) */}

       <div className="w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
           {/* Header */}
           <div className="grid grid-cols-12 gap-1 p-3 border-b border-white/10 text-xs font-bold text-white/50 uppercase">
               <div className="col-span-1 text-center">#</div>
               <div className="col-span-4">Player</div>
               <div className="col-span-3 text-center">Score</div>
               <div className="col-span-4 text-right">Reward</div>
           </div>

           {/* List */}
           {loading ? (
               <div className="p-8 flex justify-center">
                   <Loader2 className="animate-spin text-blue-500" />
               </div>
           ) : error ? (
               <div className="p-8 text-center text-red-400 text-sm">
                   {error}
               </div>
           ) : entries.length === 0 ? (
               <div className="p-8 text-center text-white/50 text-sm">
                   No players yet this season. Be the first!
               </div>
           ) : (
               <div className="max-h-[50vh] overflow-y-auto">
                   {entries.map((entry) => {
                       const reward = getWldReward(entry.rank);
                       return (
                           <div
                             key={entry.rank}
                             className="grid grid-cols-12 gap-1 p-3 border-b border-white/5 items-center"
                           >
                               <div className="col-span-1 text-center font-bold text-white text-sm">
                                   {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                               </div>
                               <div className="col-span-4 font-mono text-xs text-white/90 truncate">
                                   {entry.walletAddress}
                               </div>
                               <div className="col-span-3 text-center font-bold text-blue-400 text-sm">
                                   {entry.monthlyProfit.toLocaleString()}
                               </div>
                               <div className="col-span-4 text-right">
                                   {reward ? (
                                       <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold border border-yellow-500/30">
                                           🌐 {reward} WLD
                                       </span>
                                   ) : (
                                       <span className="text-white/30 text-xs">-</span>
                                   )}
                               </div>
                           </div>
                       );
                   })}
               </div>
           )}
       </div>

       {/* Current User Stat if not in top list (Sticky bottom) */}
       <div className="mt-4 w-full bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-xl border border-blue-500/30 flex justify-between items-center shadow-lg">
           <div>
               <p className="text-xs text-blue-300 uppercase">Your Season Score</p>
               <p className="text-xl font-bold text-white">{user.monthlyScore.toLocaleString()}</p>
           </div>
           <div className="text-right">
               <p className="text-xs text-blue-300 uppercase">Rank</p>
               <p className="text-xl font-bold text-white">{userRank || '--'}</p>
               {userRank && userRank <= 8 && (
                   <p className="text-xs text-yellow-400 mt-1">
                       🌐 {getWldReward(userRank)} WLD Prize!
                   </p>
               )}
           </div>
       </div>
    </div>
  );
};

export default Leaderboard;
