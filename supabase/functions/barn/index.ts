import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Barn game prices (for 12h cooldown reset)
const BARN_PRICES = {
  WLD: "0.03",
  USDC: "0.10",
};
// Merchant wallet for payments - loaded from environment variable
const MERCHANT_WALLET = Deno.env.get("BARN_GAME_RECIPIENT_ADDRESS");

// Validate merchant wallet at startup
function validateMerchantWallet(): string {
  const wallet = MERCHANT_WALLET;
  if (!wallet) {
    throw new Error("BARN_GAME_RECIPIENT_ADDRESS environment variable is not set");
  }
  // Basic Ethereum address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    throw new Error("BARN_GAME_RECIPIENT_ADDRESS is not a valid Ethereum address");
  }
  // Reject zero address
  if (wallet === "0x0000000000000000000000000000000000000000") {
    throw new Error("BARN_GAME_RECIPIENT_ADDRESS cannot be the zero address");
  }
  return wallet;
}

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

// Generate reference ID
function generateReferenceId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/barn/, '');

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

    // GET /barn/status - Get barn game status
    if (req.method === "GET" && path === "/status") {
      const { data: attempts } = await supabase
        .from("barn_game_attempts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const now = Date.now();
      let attemptsRemaining = 10;
      let isInCooldown = false;
      let cooldownEndsAt = null;
      let cooldownRemainingMs = 0;

      if (attempts) {
        // Check if cooldown expired
        if (attempts.cooldown_ends_at) {
          const cooldownEnd = new Date(attempts.cooldown_ends_at).getTime();
          if (now >= cooldownEnd) {
            // Reset attempts
            await supabase
              .from("barn_game_attempts")
              .update({
                attempts_remaining: 10,
                cooldown_started_at: null,
                cooldown_ends_at: null,
                total_coins_won_today: 0,
                matches_found_today: 0,
              })
              .eq("user_id", userId);
            attemptsRemaining = 10;
          } else {
            attemptsRemaining = attempts.attempts_remaining;
            isInCooldown = true;
            cooldownEndsAt = cooldownEnd;
            cooldownRemainingMs = cooldownEnd - now;
          }
        } else {
          attemptsRemaining = attempts.attempts_remaining;
        }
      }

      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            attemptsRemaining,
            isInCooldown,
            cooldownEndsAt,
            cooldownRemainingMs,
            totalCoinsWonToday: attempts?.total_coins_won_today || 0,
            matchesFoundToday: attempts?.matches_found_today || 0,
            canPlay: attemptsRemaining > 0 && !isInCooldown,
            purchasePrice: BARN_PRICES,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /barn/initiate-payment - Start payment flow
    if (req.method === "POST" && path === "/initiate-payment") {
      // Validate merchant wallet before processing payment
      let validatedWallet: string;
      try {
        validatedWallet = validateMerchantWallet();
      } catch (walletError) {
        console.error("Merchant wallet validation failed:", walletError);
        return new Response(
          JSON.stringify({ status: "error", error: "Payment system not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { tokenSymbol, itemType } = await req.json();

      if (!["WLD", "USDC"].includes(tokenSymbol)) {
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const referenceId = generateReferenceId();
      const amount = BARN_PRICES[tokenSymbol as keyof typeof BARN_PRICES];
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store payment reference
      await supabase.from("payment_references").insert({
        reference_id: referenceId,
        user_id: userId,
        amount,
        token_symbol: tokenSymbol,
        item_type: itemType,
        expires_at: expiresAt.toISOString(),
      });

      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            referenceId,
            merchantWallet: validatedWallet,
            amount,
            tokenSymbol,
            expiresAt: expiresAt.getTime(),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /barn/purchase - Verify and complete purchase
    if (req.method === "POST" && path === "/purchase") {
      const { paymentReference, transactionId, tokenSymbol } = await req.json();

      // Verify payment reference
      const { data: paymentRef } = await supabase
        .from("payment_references")
        .select("*")
        .eq("reference_id", paymentReference)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (!paymentRef) {
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid payment reference" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(paymentRef.expires_at).getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ status: "error", error: "Payment reference expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment reference status
      await supabase
        .from("payment_references")
        .update({ status: "completed" })
        .eq("id", paymentRef.id);

      // Record purchase
      const { data: purchase } = await supabase
        .from("barn_game_purchases")
        .insert({
          user_id: userId,
          payment_reference: paymentReference,
          transaction_id: transactionId,
          amount: paymentRef.amount,
          token_symbol: tokenSymbol,
          status: "confirmed",
          attempts_granted: 10,
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Reset attempts for user
      await supabase
        .from("barn_game_attempts")
        .upsert({
          user_id: userId,
          attempts_remaining: 10,
          cooldown_started_at: null,
          cooldown_ends_at: null,
          total_coins_won_today: 0,
          matches_found_today: 0,
          has_active_game: false,
        }, { onConflict: "user_id" });

      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            purchaseId: purchase.id,
            attemptsGranted: 10,
            message: "You earned 10 new matching attempts!",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("Barn game error:", error);
    // Return generic error to client - no internal details exposed
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request", errorCode: "BARN_GAME_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});