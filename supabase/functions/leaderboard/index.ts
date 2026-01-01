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

    // Get top scores for the period
    const { data: scores, error } = await supabase
      .from("game_scores")
      .select(`
        user_id,
        monthly_profit,
        score,
        users!inner(wallet_address)
      `)
      .eq("leaderboard_period", period)
      .eq("is_validated", true)
      .order("monthly_profit", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Aggregate by user
    const userScores = new Map<string, {
      walletAddress: string;
      monthlyProfit: number;
      totalScore: number;
      gamesPlayed: number;
    }>();

    for (const score of scores || []) {
      const userId = score.user_id;
      const existing = userScores.get(userId);
      
      if (existing) {
        existing.monthlyProfit = Math.max(existing.monthlyProfit, score.monthly_profit);
        existing.totalScore += score.score;
        existing.gamesPlayed++;
      } else {
        userScores.set(userId, {
          walletAddress: (score.users as any).wallet_address,
          monthlyProfit: score.monthly_profit,
          totalScore: score.score,
          gamesPlayed: 1,
        });
      }
    }

    // Sort, rank, and mask wallet addresses for privacy
    const entries = Array.from(userScores.values())
      .sort((a, b) => b.monthlyProfit - a.monthlyProfit)
      .map((entry, index) => ({
        rank: offset + index + 1,
        walletAddress: maskWalletAddress(entry.walletAddress), // Privacy: mask addresses
        monthlyProfit: entry.monthlyProfit,
        totalScore: entry.totalScore,
        gamesPlayed: entry.gamesPlayed,
      }));

    // Get total count
    const { count } = await supabase
      .from("game_scores")
      .select("user_id", { count: "exact", head: true })
      .eq("leaderboard_period", period)
      .eq("is_validated", true);

    // Get available periods
    const { data: periods } = await supabase
      .from("game_scores")
      .select("leaderboard_period")
      .eq("is_validated", true);

    const availablePeriods = [...new Set((periods || []).map(p => p.leaderboard_period))].sort().reverse();

    // Stats if requested
    let stats = undefined;
    if (includeStats && entries.length > 0) {
      const totalProfit = entries.reduce((sum, e) => sum + e.monthlyProfit, 0);
      stats = {
        totalPlayers: entries.length,
        totalGames: entries.reduce((sum, e) => sum + e.gamesPlayed, 0),
        totalProfit,
        averageProfit: Math.floor(totalProfit / entries.length),
      };
    }

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          period,
          currentPeriod: new Date().toISOString().slice(0, 7),
          availablePeriods,
          entries,
          pagination: {
            limit,
            offset,
            total: count || 0,
            hasMore: offset + limit < (count || 0),
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