import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Game validation configuration - enforced server-side
const GAME_VALIDATION = {
  garden_game: {
    maxDailyScore: 100000,
    maxMonthlyProfit: 10000000,
    minGameTime: 10, // seconds
    maxScorePerSecond: 100,
  },
  barn_game: {
    maxDailyScore: 1000,
    maxMonthlyProfit: 50000,
    minGameTime: 5, // seconds
    maxScorePerSecond: 50,
  },
} as const;

// Rate limiting configuration
const RATE_LIMIT = {
  maxSubmissionsPerMinute: 10,
  maxSubmissionsPerHour: 60,
};

// Supabase client type - using any to avoid complex generic issues in edge functions
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// Session type with user data
interface SessionWithUser {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  is_active: boolean;
  users: {
    id: string;
    wallet_address: string;
    verification_level: string;
  };
}

// Helper to verify session
async function verifySession(supabase: SupabaseClient, authHeader: string | null): Promise<SessionWithUser | null> {
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

  return session as SessionWithUser | null;
}

// Check rate limiting
async function checkRateLimit(supabase: SupabaseClient, userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check submissions in last minute
  const { count: lastMinuteCount } = await supabase
    .from("game_scores")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneMinuteAgo);

  if ((lastMinuteCount ?? 0) >= RATE_LIMIT.maxSubmissionsPerMinute) {
    return { allowed: false, reason: "Too many submissions per minute. Please wait." };
  }

  // Check submissions in last hour
  const { count: lastHourCount } = await supabase
    .from("game_scores")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);

  if ((lastHourCount ?? 0) >= RATE_LIMIT.maxSubmissionsPerHour) {
    return { allowed: false, reason: "Too many submissions per hour. Please wait." };
  }

  return { allowed: true };
}

// Validate score based on game type
function validateScore(
  gameType: string,
  score: number,
  monthlyProfit: number,
  timeTaken: number | null
): { valid: boolean; reason?: string } {
  const config = GAME_VALIDATION[gameType as keyof typeof GAME_VALIDATION];
  
  if (!config) {
    return { valid: false, reason: `Unknown game type: ${gameType}` };
  }

  // Check score bounds
  if (score < 0) {
    return { valid: false, reason: "Score cannot be negative" };
  }
  
  if (score > config.maxDailyScore) {
    return { valid: false, reason: `Score exceeds maximum allowed (${config.maxDailyScore})` };
  }

  // Check monthly profit bounds
  if (monthlyProfit < 0) {
    return { valid: false, reason: "Monthly profit cannot be negative" };
  }
  
  if (monthlyProfit > config.maxMonthlyProfit) {
    return { valid: false, reason: `Monthly profit exceeds maximum allowed (${config.maxMonthlyProfit})` };
  }

  // Check minimum game time - BLOCK submissions that are too fast
  if (timeTaken !== null && timeTaken < config.minGameTime) {
    return { valid: false, reason: `Game completed too quickly (minimum ${config.minGameTime}s required)` };
  }

  // Check score per second rate
  if (timeTaken !== null && timeTaken > 0) {
    const scorePerSecond = score / timeTaken;
    if (scorePerSecond > config.maxScorePerSecond) {
      return { valid: false, reason: "Score rate exceeds possible limits" };
    }
  }

  return { valid: true };
}

// Validate sessionId exists and belongs to user
async function validateSession(
  supabase: SupabaseClient,
  sessionId: string | null,
  userId: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!sessionId) {
    // Session ID is optional but recommended
    return { valid: true };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return { valid: false, reason: "Invalid session ID format" };
  }

  // Check if session belongs to user
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (session && session.user_id !== userId) {
    return { valid: false, reason: "Session does not belong to user" };
  }

  return { valid: true };
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
    
    // Rate limiting check
    const rateLimitResult = await checkRateLimit(supabase, userId);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${userId}: ${rateLimitResult.reason}`);
      return new Response(
        JSON.stringify({ status: "error", error: rateLimitResult.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { gameType, score, monthlyProfit, sessionId, gameStartedAt, gameEndedAt, validationData } = body;

    // Input type validation
    if (!gameType || typeof gameType !== "string") {
      return new Response(
        JSON.stringify({ status: "error", error: "gameType must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof score !== "number" || !Number.isFinite(score)) {
      return new Response(
        JSON.stringify({ status: "error", error: "score must be a valid number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate time taken
    const timeTaken = gameEndedAt && gameStartedAt
      ? Math.floor((gameEndedAt - gameStartedAt) / 1000)
      : null;

    // Comprehensive score validation
    const scoreValidation = validateScore(gameType, score, monthlyProfit || 0, timeTaken);
    if (!scoreValidation.valid) {
      console.log(`Score validation failed for user ${userId}: ${scoreValidation.reason}`);
      return new Response(
        JSON.stringify({ status: "error", error: scoreValidation.reason }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Session validation
    const sessionValidation = await validateSession(supabase, sessionId, userId);
    if (!sessionValidation.valid) {
      console.log(`Session validation failed for user ${userId}: ${sessionValidation.reason}`);
      return new Response(
        JSON.stringify({ status: "error", error: sessionValidation.reason }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current leaderboard period (YYYY-MM)
    const leaderboardPeriod = new Date().toISOString().slice(0, 7);

    // Insert score (all validation passed)
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
        is_validated: true, // All validation passed
        leaderboard_period: leaderboardPeriod,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Score submitted successfully for user ${userId}: ${score} in ${gameType}`);

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          scoreId: scoreRecord.id,
          score: scoreRecord.score,
          monthlyProfit: scoreRecord.monthly_profit,
          leaderboardPeriod: scoreRecord.leaderboard_period,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("Score submission error:", error);
    // Return generic error to client - no internal details exposed
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request", errorCode: "SCORE_SUBMISSION_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});