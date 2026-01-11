import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mask wallet address for privacy (show first 6 and last 4 characters)
function maskWalletAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format time as MM:SS:ms for display
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const includeStats = url.searchParams.get("stats") === "true";

    // Get best scores for each user in the period
    // Since we only keep one entry per user/game_type/period, just fetch all validated scores
    const { data: scores, error } = await supabase
      .from("game_scores")
      .select(`
        user_id,
        monthly_profit,
        score,
        moves,
        time_taken,
        users!inner(wallet_address)
      `)
      .eq("leaderboard_period", period)
      .eq("is_validated", true)
      .not("moves", "is", null)
      .order("moves", { ascending: true }) // Fewer moves = better
      .order("time_taken", { ascending: true }); // Faster time = better

    if (error) throw error;

    // Since we now have one entry per user per game type, aggregate by user
    // and keep their best game (fewest moves, then fastest time)
    const userBestScores = new Map<string, {
      walletAddress: string;
      moves: number;
      timeTaken: number;
      score: number;
      monthlyProfit: number;
      gamesPlayed: number;
    }>();

    for (const score of scores || []) {
      const userId = score.user_id;
      const existing = userBestScores.get(userId);
      
      // users is returned as a single object from inner join
      const usersData = score.users as unknown as { wallet_address: string } | null;
      const walletAddress = usersData?.wallet_address || '';
      
      const currentMoves = score.moves ?? 999999;
      const currentTime = score.time_taken ?? 999999;
      
      if (existing) {
        existing.gamesPlayed++;
        // Check if this score is better (fewer moves, or same moves but faster)
        const isBetter = currentMoves < existing.moves || 
          (currentMoves === existing.moves && currentTime < existing.timeTaken);
        
        if (isBetter) {
          existing.moves = currentMoves;
          existing.timeTaken = currentTime;
          existing.score = score.score;
          existing.monthlyProfit = score.monthly_profit;
        }
      } else {
        userBestScores.set(userId, {
          walletAddress,
          moves: currentMoves,
          timeTaken: currentTime,
          score: score.score,
          monthlyProfit: score.monthly_profit,
          gamesPlayed: 1,
        });
      }
    }

    // Sort by moves (ascending), then by time_taken (ascending)
    const sortedEntries = Array.from(userBestScores.values())
      .sort((a, b) => {
        if (a.moves !== b.moves) return a.moves - b.moves; // Fewer moves = better
        return a.timeTaken - b.timeTaken; // Faster time = better
      });

    // Apply pagination and mask addresses
    const paginatedEntries = sortedEntries
      .slice(offset, offset + limit)
      .map((entry, index) => ({
        rank: offset + index + 1,
        walletAddress: maskWalletAddress(entry.walletAddress),
        moves: entry.moves,
        timeTaken: entry.timeTaken,
        formattedTime: formatTime(entry.timeTaken),
        score: entry.score,
        monthlyProfit: entry.monthlyProfit,
        gamesPlayed: entry.gamesPlayed,
      }));

    // Get available periods
    const { data: periods } = await supabase
      .from("game_scores")
      .select("leaderboard_period")
      .eq("is_validated", true);

    const availablePeriods = [...new Set((periods || []).map(p => p.leaderboard_period))].sort().reverse();

    // Stats if requested
    let stats = undefined;
    if (includeStats && sortedEntries.length > 0) {
      const totalProfit = sortedEntries.reduce((sum, e) => sum + e.monthlyProfit, 0);
      stats = {
        totalPlayers: sortedEntries.length,
        totalGames: sortedEntries.reduce((sum, e) => sum + e.gamesPlayed, 0),
        totalProfit,
        averageProfit: Math.floor(totalProfit / sortedEntries.length),
        bestMoves: sortedEntries[0]?.moves ?? 0,
        bestTime: sortedEntries[0]?.timeTaken ?? 0,
      };
    }

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          period,
          currentPeriod: new Date().toISOString().slice(0, 7),
          availablePeriods,
          entries: paginatedEntries,
          pagination: {
            limit,
            offset,
            total: sortedEntries.length,
            hasMore: offset + limit < sortedEntries.length,
          },
          stats,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("Leaderboard error:", error);
    // Return generic error to client - no internal details exposed
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request", errorCode: "LEADERBOARD_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
