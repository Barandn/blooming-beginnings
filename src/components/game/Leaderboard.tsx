import React, { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { Loader2 } from "lucide-react";
import { getLeaderboard } from "@/lib/minikit/api"; // Mock/Real API

// Types for Leaderboard
interface LeaderboardEntry {
  rank: number;
  userId: string; // "0x1234...5678"
  score: number;
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

              // We simulate "fetching" and mixing in current user if they are top
              const mockData: LeaderboardEntry[] = Array.from({ length: 10 }).map((_, i) => ({
                  rank: i + 1,
                  userId: `0x${Math.random().toString(16).substr(2, 8)}...`,
                  score: Math.floor(10000 - (i * 500) + Math.random() * 100),
                  isCurrentUser: false
              }));

              // Check if user should be in top 10 (locally)
              // In real app, the backend returns the sorted list including user position

              // Add current user for demo if they have score
              if (user.monthlyScore > 0) {
                   // This logic is just for display if backend isn't ready
              }

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
           <div className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold mt-2 inline-block shadow-lg">
               {monthName} '{year.toString().slice(2)} Season
           </div>
       </div>

       {/* Top 3 Podium (Optional visual, kept simple list for now as per "List top users" req) */}

       <div className="w-full bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
           {/* Header */}
           <div className="grid grid-cols-12 gap-2 p-4 border-b border-white/10 text-xs font-bold text-white/50 uppercase">
               <div className="col-span-2 text-center">Rank</div>
               <div className="col-span-7">Player</div>
               <div className="col-span-3 text-right">Score</div>
           </div>

           {/* List */}
           {loading ? (
               <div className="p-8 flex justify-center">
                   <Loader2 className="animate-spin text-green-500" />
               </div>
           ) : (
               <div className="max-h-[50vh] overflow-y-auto">
                   {entries.map((entry) => (
                       <div
                         key={entry.rank}
                         className={`grid grid-cols-12 gap-2 p-4 border-b border-white/5 items-center ${
                             entry.isCurrentUser ? "bg-green-500/20" : ""
                         }`}
                       >
                           <div className="col-span-2 text-center font-bold text-white">
                               {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                           </div>
                           <div className="col-span-7 font-mono text-sm text-white/90 truncate">
                               {entry.userId}
                           </div>
                           <div className="col-span-3 text-right font-bold text-green-400">
                               {entry.score.toLocaleString()}
                           </div>
                       </div>
                   ))}
               </div>
           )}
       </div>

       {/* Current User Stat if not in top list (Sticky bottom) */}
       <div className="mt-4 w-full bg-gradient-to-r from-green-900 to-green-800 p-4 rounded-xl border border-green-500/30 flex justify-between items-center shadow-lg">
           <div>
               <p className="text-xs text-green-300 uppercase">Your Season Score</p>
               <p className="text-xl font-bold text-white">{user.monthlyScore.toLocaleString()}</p>
           </div>
           <div className="text-right">
               <p className="text-xs text-green-300 uppercase">Rank</p>
               <p className="text-xl font-bold text-white">--</p>
               {/* Rank would come from API in real implementation */}
           </div>
       </div>
    </div>
  );
};

export default Leaderboard;
