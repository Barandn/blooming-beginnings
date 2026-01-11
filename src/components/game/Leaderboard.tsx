import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { Loader2 } from "lucide-react";
import { getLeaderboard } from "@/lib/minikit/api"; // Mock/Real API

// Format time as MM:SS:ms
const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`;
};

// Calculate reward based on rank
const getReward = (rank: number): number => {
  if (rank === 1) return 20;
  if (rank === 2) return 15;
  if (rank === 3) return 10;
  if (rank >= 4 && rank <= 10) return 5;
  if (rank >= 11 && rank <= 20) return 2;
  return 0;
};

// Types for Leaderboard
interface LeaderboardEntry {
  rank: number;
  userId: string; // "0x1234...5678"
  score: number;
  moves: number;
  elapsedTime: number; // in milliseconds
  isCurrentUser: boolean;
}

const Leaderboard = () => {
  const { user } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchLeaderboard = async () => {
          setLoading(true);
          try {
              // Mock Data Generation if API fails or for initial dev
              // In production: const data = await getLeaderboard("2025-01");

              // We simulate "fetching" with moves and time data
              const mockData: LeaderboardEntry[] = Array.from({ length: 20 }).map((_, i) => ({
                  rank: 0, // Will be calculated after sorting
                  userId: `0x${Math.random().toString(16).substr(2, 8)}...`,
                  score: Math.floor(10000 - (i * 500) + Math.random() * 100),
                  moves: 8 + Math.floor(i * 0.5) + Math.floor(Math.random() * 3), // 8-15 moves range
                  elapsedTime: 15000 + (i * 5000) + Math.floor(Math.random() * 10000), // 15-70 seconds range
                  isCurrentUser: false
              }));

              // Sort: first by moves (ascending), then by time (ascending)
              mockData.sort((a, b) => {
                  if (a.moves !== b.moves) {
                      return a.moves - b.moves; // Lower moves = better
                  }
                  return a.elapsedTime - b.elapsedTime; // Lower time = better
              });

              // Assign ranks after sorting
              mockData.forEach((entry, index) => {
                  entry.rank = index + 1;
              });

              setEntries(mockData);

          } catch (e) {
              console.error(e);
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

       {/* Top 3 Podium (Optional visual, kept simple list for now as per "List top users" req) */}

       <div className="w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
           {/* Header */}
           <div className="grid grid-cols-12 gap-1 p-3 border-b border-white/10 text-xs font-bold text-white/50 uppercase">
               <div className="col-span-1 text-center">#</div>
               <div className="col-span-3">Player</div>
               <div className="col-span-2 text-center">Moves</div>
               <div className="col-span-3 text-center">Time</div>
               <div className="col-span-3 text-center">Reward</div>
           </div>

           {/* List */}
           {loading ? (
               <div className="p-8 flex justify-center">
                   <Loader2 className="animate-spin text-blue-500" />
               </div>
           ) : (
               <div className="max-h-[50vh] overflow-y-auto">
                   {entries.map((entry) => {
                       const reward = getReward(entry.rank);
                       return (
                           <div
                             key={entry.rank}
                             className={`grid grid-cols-12 gap-1 p-3 border-b border-white/5 items-center ${
                                 entry.isCurrentUser ? "bg-blue-500/20" : ""
                             }`}
                           >
                               <div className="col-span-1 text-center font-bold text-white text-sm">
                                   {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                               </div>
                               <div className="col-span-3 font-mono text-xs text-white/90 truncate">
                                   {entry.userId}
                               </div>
                               <div className="col-span-2 text-center font-bold text-blue-400 text-sm">
                                   {entry.moves}
                               </div>
                               <div className="col-span-3 text-center font-mono text-blue-300 text-xs">
                                   {formatTime(entry.elapsedTime)}
                               </div>
                               <div className="col-span-3 text-center">
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

       {/* Current User Stat if not in top list (Sticky bottom) */}
       <div className="mt-4 w-full bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-xl border border-blue-500/30 flex justify-between items-center shadow-lg">
           <div>
               <p className="text-xs text-blue-300 uppercase">Your Season Score</p>
               <p className="text-xl font-bold text-white">{user.monthlyScore.toLocaleString()}</p>
           </div>
           <div className="text-right">
               <p className="text-xs text-blue-300 uppercase">Rank</p>
               <p className="text-xl font-bold text-white">--</p>
               {/* Rank would come from API in real implementation */}
           </div>
       </div>
    </div>
  );
};

export default Leaderboard;
