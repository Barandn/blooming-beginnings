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

  if (req.method !== "POST") {
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

    const authHeader = req.headers.get("Authorization");
    const session = await verifySession(supabase, authHeader);

    if (!session) {
      return new Response(
        JSON.stringify({ status: "error", error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = session.users.id;
    const body = await req.json();
    const { gameType, score, monthlyProfit, sessionId, gameStartedAt, gameEndedAt, validationData } = body;

    // Basic validation
    if (!gameType || typeof score !== "number") {
      return new Response(
        JSON.stringify({ status: "error", error: "Invalid score data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate time taken
    const timeTaken = gameEndedAt && gameStartedAt
      ? Math.floor((gameEndedAt - gameStartedAt) / 1000)
      : null;

    // Get current leaderboard period (YYYY-MM)
    const leaderboardPeriod = new Date().toISOString().slice(0, 7);

    // Anti-cheat flags
    const flags: string[] = [];
    
    // Check for suspicious time (too fast)
    if (timeTaken !== null && timeTaken < 5) {
      flags.push("SUSPICIOUS_TIME");
    }
    
    // Check for impossible scores
    if (gameType === "barn_game" && score > 1000) {
      flags.push("IMPOSSIBLE_SCORE");
    }

    // Insert score
    const { data: scoreRecord, error } = await supabase
      .from("game_scores")
      .insert({
        user_id: userId,
        game_type: gameType,
        score,
        monthly_profit: monthlyProfit || 0,
        session_id: sessionId || null,
        time_taken: timeTaken,
        game_started_at: gameStartedAt ? new Date(gameStartedAt).toISOString() : null,
        validation_data: validationData ? JSON.stringify(validationData) : null,
        is_validated: flags.length === 0,
        leaderboard_period: leaderboardPeriod,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          scoreId: scoreRecord.id,
          score: scoreRecord.score,
          monthlyProfit: scoreRecord.monthly_profit,
          leaderboardPeriod: scoreRecord.leaderboard_period,
          flags: flags.length > 0 ? flags : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Score submission error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "error", error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});