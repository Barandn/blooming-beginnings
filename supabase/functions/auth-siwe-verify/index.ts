import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";
import { verifyMessage } from "https://esm.sh/viem@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Session expires in 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate JWT token for session
 */
async function generateSessionToken(
  userId: string,
  walletAddress: string,
  jwtSecret: string
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new jose.SignJWT({
    userId,
    walletAddress,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

/**
 * Hash token for storage
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { message, signature, address, nonce } = body;

    // Validate required fields
    if (!message || !signature || !address || !nonce) {
      return new Response(
        JSON.stringify({ status: "error", error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate nonce
    const { data: nonceRecord, error: nonceError } = await supabase
      .from("siwe_nonces")
      .select("*")
      .eq("nonce", nonce)
      .maybeSingle();

    if (nonceError || !nonceRecord) {
      return new Response(
        JSON.stringify({ status: "error", error: "Invalid nonce" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if nonce is expired
    if (new Date() > new Date(nonceRecord.expires_at)) {
      await supabase.from("siwe_nonces").delete().eq("nonce", nonce);
      return new Response(
        JSON.stringify({ status: "error", error: "Nonce expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already consumed
    if (nonceRecord.consumed_at) {
      return new Response(
        JSON.stringify({ status: "error", error: "Nonce already used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature
    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch (verifyError) {
      console.error("Signature verification error:", verifyError);
      isValid = false;
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ status: "error", error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark nonce as consumed
    await supabase
      .from("siwe_nonces")
      .update({ consumed_at: new Date().toISOString() })
      .eq("nonce", nonce);

    // Normalize wallet address
    const walletAddress = address.toLowerCase();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    let user;
    let isNewUser = false;

    if (existingUser) {
      // Update last login
      const { data: updatedUser } = await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", existingUser.id)
        .select()
        .single();
      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          wallet_address: walletAddress,
          nullifier_hash: walletAddress, // Use wallet address as nullifier for SIWE
          verification_level: "wallet",
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("User creation error:", createError);
        return new Response(
          JSON.stringify({ status: "error", error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user = newUser;
      isNewUser = true;
    }

    // Generate session token
    const jwtSecret = Deno.env.get("JWT_SECRET") || "fallback-secret-key";
    const token = await generateSessionToken(user.id, walletAddress, jwtSecret);
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    // Create session
    await supabase.from("sessions").insert({
      user_id: user.id,
      wallet_address: walletAddress,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          isNewUser,
          token,
          user: {
            id: user.id,
            walletAddress: user.wallet_address,
            verificationLevel: user.verification_level,
            createdAt: user.created_at,
          },
          expiresAt: expiresAt.toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SIWE verify error:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
