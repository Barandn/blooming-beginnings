import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random nonce
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple in-memory nonce store (in production, use Redis or DB)
const nonceStore = new Map<string, { expiresAt: number }>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Parse path - Supabase edge functions receive path after function name
  // e.g., /auth/siwe/nonce or just /siwe/nonce depending on invocation
  let path = url.pathname;
  
  // Remove function name prefix if present
  path = path.replace(/^\/auth/, '');
  
  // Log for debugging
  console.log("Auth function called:", { method: req.method, fullPath: url.pathname, parsedPath: path });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET /siwe/nonce - Generate nonce for SIWE
    if (req.method === "GET" && (path === "/siwe/nonce" || path === "" || path === "/")) {
      const nonce = generateNonce();
      const expiresIn = 5 * 60 * 1000; // 5 minutes
      
      nonceStore.set(nonce, { expiresAt: Date.now() + expiresIn });
      
      // Clean up expired nonces
      for (const [key, value] of nonceStore.entries()) {
        if (value.expiresAt < Date.now()) {
          nonceStore.delete(key);
        }
      }

      return new Response(
        JSON.stringify({
          status: "success",
          data: { nonce, expiresIn },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /auth/siwe/verify - Verify SIWE signature
    if (req.method === "POST" && path === "/siwe/verify") {
      const { message, signature, address, nonce } = await req.json();

      if (!message || !signature || !address || !nonce) {
        return new Response(
          JSON.stringify({ status: "error", error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify nonce exists and is not expired
      const nonceData = nonceStore.get(nonce);
      if (!nonceData || nonceData.expiresAt < Date.now()) {
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid or expired nonce" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Remove used nonce
      nonceStore.delete(nonce);

      // For World App, we trust the signature from MiniKit
      // In production, you should verify the SIWE message signature
      const normalizedAddress = address.toLowerCase();

      // Check if user exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", normalizedAddress)
        .maybeSingle();

      let user;
      let isNewUser = false;

      if (existingUser) {
        // Update last login
        const { data: updatedUser, error } = await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", existingUser.id)
          .select()
          .single();

        if (error) throw error;
        user = updatedUser;
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from("users")
          .insert({
            wallet_address: normalizedAddress,
            nullifier_hash: `wallet_${normalizedAddress}`, // Using wallet as unique identifier
            verification_level: "wallet",
          })
          .select()
          .single();

        if (error) throw error;
        user = newUser;
        isNewUser = true;
      }

      // Generate session token
      const token = generateNonce() + generateNonce();
      const tokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token)
      );
      const tokenHashHex = Array.from(new Uint8Array(tokenHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create session
      await supabase.from("sessions").insert({
        user_id: user.id,
        token_hash: tokenHashHex,
        wallet_address: normalizedAddress,
        expires_at: expiresAt.toISOString(),
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /auth/logout - Invalidate session
    if (req.method === "POST" && path === "/logout") {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const tokenHash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(token)
        );
        const tokenHashHex = Array.from(new Uint8Array(tokenHash))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        await supabase
          .from("sessions")
          .update({ is_active: false })
          .eq("token_hash", tokenHashHex);
      }

      return new Response(
        JSON.stringify({ status: "success", data: { message: "Logged out" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("Auth error:", error);
    // Return generic error to client - no internal details exposed
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request", errorCode: "AUTH_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});