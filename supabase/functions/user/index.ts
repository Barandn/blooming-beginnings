import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to verify session
async function verifySession(supabase: any, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const tokenHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  const tokenHashHex = Array.from(new Uint8Array(tokenHash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: session } = await supabase
    .from("sessions")
    .select("*, users(*)")
    .eq("token_hash", tokenHashHex)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return session;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    const session = await verifySession(supabase, authHeader);

    if (!session) {
      return new Response(
        JSON.stringify({ status: "error", error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = session.users;
    const userId = user.id;

    // Get user stats
    const { data: scores } = await supabase
      .from("game_scores")
      .select("score, monthly_profit")
      .eq("user_id", userId);

    const { data: claims } = await supabase
      .from("claim_transactions")
      .select("amount, status")
      .eq("user_id", userId)
      .eq("status", "confirmed");

    const { data: todayBonus } = await supabase
      .from("daily_bonus_claims")
      .select("*")
      .eq("user_id", userId)
      .eq("claim_date", new Date().toISOString().split("T")[0])
      .maybeSingle();

    const { data: recentTxs } = await supabase
      .from("claim_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate stats
    const totalScore = scores?.reduce((sum: number, s: any) => sum + s.score, 0) || 0;
    const bestScore = scores?.length
      ? Math.max(...scores.map((s: any) => s.score))
      : 0;
    const totalTokensClaimed = claims?.reduce(
      (sum: string, c: any) => (BigInt(sum) + BigInt(c.amount)).toString(),
      "0"
    ) || "0";

    // Current month profit
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: monthScores } = await supabase
      .from("game_scores")
      .select("monthly_profit")
      .eq("user_id", userId)
      .eq("leaderboard_period", currentMonth);

    const currentMonthProfit = monthScores?.length
      ? Math.max(...monthScores.map((s: any) => s.monthly_profit))
      : 0;

    // Daily bonus cooldown
    const lastClaimTime = todayBonus?.claimed_at
      ? new Date(todayBonus.claimed_at).getTime()
      : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;
    const cooldownRemainingMs = Math.max(0, lastClaimTime + cooldownMs - Date.now());

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          user: {
            id: user.id,
            walletAddress: user.wallet_address,
            verificationLevel: user.verification_level,
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at,
          },
          stats: {
            totalTokensClaimed,
            claimCount: claims?.length || 0,
            totalGamesPlayed: scores?.length || 0,
            totalScore,
            bestScore,
            currentMonthRank: null,
            currentMonthProfit,
          },
          dailyBonus: {
            available: !todayBonus,
            claimedToday: !!todayBonus,
            cooldownRemainingMs,
            amount: "100",
          },
          recentTransactions: (recentTxs || []).map((tx: any) => ({
            id: tx.id,
            type: tx.claim_type,
            amount: tx.amount,
            status: tx.status,
            txHash: tx.tx_hash,
            explorerUrl: tx.tx_hash
              ? `https://worldscan.org/tx/${tx.tx_hash}`
              : null,
            createdAt: tx.created_at,
          })),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("User profile error:", error);
    // Return generic error to client - no internal details exposed
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request", errorCode: "USER_PROFILE_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});