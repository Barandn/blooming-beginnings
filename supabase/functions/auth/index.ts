import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_NONCES_PER_IP = 10; // Max 10 nonces per IP per 5 minutes

// In-memory rate limit store (resets on function cold start, but provides basic protection)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Check rate limit for nonce generation
function checkNonceRateLimit(ipAddress: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ipAddress);
  
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(ipAddress, { count: 1, windowStart: now });
    return { allowed: true };
  }
  
  if (entry.count >= MAX_NONCES_PER_IP) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

// Clean up old rate limit entries periodically
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

// ERC-1271 interface for smart contract wallet signature verification
const ERC1271_ABI = [
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)"
];
const ERC1271_MAGIC_VALUE = "0x1626ba7e";

// Generate a random nonce
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Parse SIWE message to extract fields
function parseSiweMessage(message: string): {
  domain?: string;
  address?: string;
  statement?: string;
  uri?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
} {
  const lines = message.split('\n');
  const result: Record<string, string> = {};
  
  // First line contains domain
  if (lines[0]) {
    const domainMatch = lines[0].match(/^(.+) wants you to sign in with your Ethereum account:$/);
    if (domainMatch) {
      result.domain = domainMatch[1];
    }
  }
  
  // Second line contains address
  if (lines[1]) {
    result.address = lines[1].trim();
  }
  
  // Parse remaining fields
  for (const line of lines) {
    if (line.startsWith('Nonce: ')) {
      result.nonce = line.slice(7);
    } else if (line.startsWith('Issued At: ')) {
      result.issuedAt = line.slice(11);
    } else if (line.startsWith('Expiration Time: ')) {
      result.expirationTime = line.slice(17);
    } else if (line.startsWith('URI: ')) {
      result.uri = line.slice(5);
    }
  }
  
  return result;
}

// Verify signature using ERC-1271 for smart contract wallets
async function verifyERC1271Signature(
  address: string, 
  message: string, 
  signature: string
): Promise<boolean> {
  try {
    const rpcUrl = Deno.env.get("WORLDCHAIN_RPC_URL") || "https://worldchain-mainnet.g.alchemy.com/public";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const contract = new ethers.Contract(address, ERC1271_ABI, provider);
    const messageHash = ethers.hashMessage(message);
    
    const result = await contract.isValidSignature(messageHash, signature);
    return result === ERC1271_MAGIC_VALUE;
  } catch (error) {
    console.log("ERC-1271 verification failed:", error);
    return false;
  }
}

// Verify SIWE signature - supports both EOA and smart contract wallets
async function verifySiweSignature(
  address: string,
  message: string,
  signature: string
): Promise<{ valid: boolean; recoveredAddress?: string; error?: string }> {
  try {
    // First, try standard EOA signature verification
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        console.log("EOA signature verified successfully");
        return { valid: true, recoveredAddress };
      }
    } catch (eoaError) {
      console.log("EOA verification failed, trying ERC-1271:", eoaError);
    }
    
    // If EOA verification fails, try ERC-1271 (smart contract wallet like World App)
    const isValidContract = await verifyERC1271Signature(address, message, signature);
    if (isValidContract) {
      console.log("ERC-1271 signature verified successfully");
      return { valid: true, recoveredAddress: address };
    }
    
    return { valid: false, error: "Signature verification failed" };
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, error: "Signature verification error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/auth/, '');
  
  console.log("Auth function called:", { method: req.method, fullPath: url.pathname, parsedPath: path });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GET /siwe/nonce - Generate nonce for SIWE
    if (req.method === "GET" && (path === "/siwe/nonce" || path === "" || path === "/")) {
      // Get client IP for rate limiting
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
        || req.headers.get("x-real-ip") 
        || "unknown";
      
      // Check rate limit
      cleanupRateLimitStore();
      const rateLimitResult = checkNonceRateLimit(ipAddress);
      
      if (!rateLimitResult.allowed) {
        console.log("Rate limit exceeded for IP:", ipAddress);
        return new Response(
          JSON.stringify({ status: "error", error: "Too many requests. Please try again later.", errorCode: "RATE_LIMIT_EXCEEDED" }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": String(rateLimitResult.retryAfter || 60)
            } 
          }
        );
      }
      
      const nonce = generateNonce();
      const expiresIn = 5 * 60 * 1000; // 5 minutes
      const expiresAt = new Date(Date.now() + expiresIn).toISOString();
      
      // Clean up expired nonces first
      await supabase
        .from("siwe_nonces")
        .delete()
        .lt("expires_at", new Date().toISOString());
      
      // Store nonce in database (persisted across edge function instances)
      const { error: insertError } = await supabase
        .from("siwe_nonces")
        .insert({ nonce, expires_at: expiresAt });
      
      if (insertError) {
        console.error("Failed to store nonce:", insertError);
        return new Response(
          JSON.stringify({ status: "error", error: "Failed to generate nonce", errorCode: "NONCE_STORE_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Nonce generated and stored:", { nonce: nonce.substring(0, 8) + "...", expiresAt, ip: ipAddress });

      return new Response(
        JSON.stringify({
          status: "success",
          data: { nonce, expiresIn },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /siwe/verify - Verify SIWE signature
    if (req.method === "POST" && path === "/siwe/verify") {
      const { message, signature, address, nonce } = await req.json();

      if (!message || !signature || !address || !nonce) {
        return new Response(
          JSON.stringify({ status: "error", error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid address format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse and validate SIWE message
      const parsedMessage = parseSiweMessage(message);
      
      // Verify address in message matches provided address
      if (parsedMessage.address?.toLowerCase() !== address.toLowerCase()) {
        console.log("Address mismatch:", { messageAddress: parsedMessage.address, providedAddress: address });
        return new Response(
          JSON.stringify({ status: "error", error: "Address mismatch in message" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify nonce in message matches provided nonce
      if (parsedMessage.nonce !== nonce) {
        console.log("Nonce mismatch:", { messageNonce: parsedMessage.nonce, providedNonce: nonce });
        return new Response(
          JSON.stringify({ status: "error", error: "Nonce mismatch in message" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check message expiration if present
      if (parsedMessage.expirationTime) {
        const expirationDate = new Date(parsedMessage.expirationTime);
        if (expirationDate < new Date()) {
          return new Response(
            JSON.stringify({ status: "error", error: "Message has expired" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Verify nonce exists in database and is not expired or consumed
      const { data: nonceData, error: nonceError } = await supabase
        .from("siwe_nonces")
        .select("*")
        .eq("nonce", nonce)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (nonceError) {
        console.error("Nonce lookup error:", nonceError);
        return new Response(
          JSON.stringify({ status: "error", error: "Nonce verification failed", errorCode: "NONCE_LOOKUP_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!nonceData) {
        console.log("Invalid or expired nonce:", { nonce: nonce.substring(0, 8) + "..." });
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid or expired nonce" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // CRITICAL: Verify the signature cryptographically
      const signatureResult = await verifySiweSignature(address, message, signature);
      
      if (!signatureResult.valid) {
        console.log("Signature verification failed for address:", address);
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Signature verified successfully for address:", address);
      
      // Mark nonce as consumed AFTER successful signature verification
      const { error: consumeError } = await supabase
        .from("siwe_nonces")
        .update({ consumed_at: new Date().toISOString() })
        .eq("nonce", nonce);

      if (consumeError) {
        console.error("Failed to consume nonce:", consumeError);
        // Continue anyway - signature was valid
      }
      
      console.log("Nonce consumed successfully:", { nonce: nonce.substring(0, 8) + "..." });

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
            nullifier_hash: `wallet_${normalizedAddress}`,
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

    // POST /logout - Invalidate session
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
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request", errorCode: "AUTH_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
