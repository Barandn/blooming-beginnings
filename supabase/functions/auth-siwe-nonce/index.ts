import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nonce expires after 5 minutes
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Generate a cryptographically secure nonce
 * At least 8 alphanumeric characters as required by World App
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up expired nonces (non-blocking)
    (async () => {
      try {
        await supabase
          .from("siwe_nonces")
          .delete()
          .lt("expires_at", new Date().toISOString());
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    })();

    // Generate new nonce
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS).toISOString();

    // Store nonce in database
    const { error: insertError } = await supabase.from("siwe_nonces").insert({
      nonce,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ status: "error", error: "Failed to generate nonce" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          nonce,
          expiresIn: NONCE_EXPIRY_MS,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Nonce generation error:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "Failed to generate nonce" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
