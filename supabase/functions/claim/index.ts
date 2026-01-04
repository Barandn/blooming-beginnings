import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// World Chain Configuration
const WORLD_CHAIN = {
  MAINNET: {
    chainId: 480,
    rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
  },
  TESTNET: {
    chainId: 4801,
    rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  },
};

// Use mainnet by default
const ACTIVE_CHAIN = Deno.env.get("USE_TESTNET") === "true"
  ? WORLD_CHAIN.TESTNET
  : WORLD_CHAIN.MAINNET;

// Claim types matching the contract enum
enum ClaimType {
  DAILY_BONUS = 0,
  GAME_REWARD = 1,
}

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
    .map((b) => b.toString(16).padStart(2, "0"))
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

// Get user's current nonce from the contract
async function getUserNonce(userAddress: string, contractAddress: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);
  const abi = ["function getNonce(address user) view returns (uint256)"];
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const nonce = await contract.getNonce(userAddress);
  return Number(nonce);
}

// Generate claim signature
async function generateClaimSignature(
  userAddress: string,
  amount: bigint,
  claimType: ClaimType,
  contractAddress: string,
  signerPrivateKey: string
): Promise<{ signature: string; nonce: number; deadline: number }> {
  const signer = new ethers.Wallet(signerPrivateKey);
  const nonce = await getUserNonce(userAddress, contractAddress);
  const deadline = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes

  // Create message hash (must match contract's hashing)
  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint8", "uint256", "uint256", "uint256", "address"],
    [
      userAddress,
      amount,
      claimType,
      nonce,
      deadline,
      ACTIVE_CHAIN.chainId,
      contractAddress,
    ]
  );

  // Sign the message hash
  const signature = await signer.signMessage(ethers.getBytes(messageHash));

  return { signature, nonce, deadline };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/claim/, "");

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
    if (!user.wallet_address) {
      return new Response(
        JSON.stringify({ status: "error", error: "No wallet address registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /claim/signature - Generate signature for gasless claim
    if (req.method === "POST" && (path === "/signature" || path === "")) {
      const contractAddress = Deno.env.get("CLAIM_CONTRACT_ADDRESS");
      const signerPrivateKey = Deno.env.get("CLAIM_SIGNER_PRIVATE_KEY");
      const dailyBonusAmount = Deno.env.get("DAILY_BONUS_AMOUNT") || "200000000000000000000";
      const gameRewardMultiplier = BigInt(Deno.env.get("GAME_REWARD_MULTIPLIER") || "1000000000000000");

      if (!contractAddress || !signerPrivateKey) {
        return new Response(
          JSON.stringify({ status: "error", error: "Claim system not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { claimType, score } = body as {
        claimType: "daily_bonus" | "game_reward";
        score?: number;
      };

      if (!claimType) {
        return new Response(
          JSON.stringify({ status: "error", error: "claimType is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let amount: bigint;
      let contractClaimType: ClaimType;

      if (claimType === "daily_bonus") {
        // Check if already claimed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const { data: existingClaim } = await supabase
          .from("daily_bonus_claims")
          .select("id")
          .eq("user_id", user.id)
          .eq("claim_date", todayStr)
          .maybeSingle();

        if (existingClaim) {
          const nextClaimAt = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          return new Response(
            JSON.stringify({
              status: "error",
              error: "Daily bonus already claimed today",
              nextClaimAt: nextClaimAt.toISOString(),
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        amount = BigInt(dailyBonusAmount);
        contractClaimType = ClaimType.DAILY_BONUS;
      } else if (claimType === "game_reward") {
        if (typeof score !== "number" || score <= 0) {
          return new Response(
            JSON.stringify({ status: "error", error: "Valid score is required for game rewards" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        amount = BigInt(score) * gameRewardMultiplier;
        contractClaimType = ClaimType.GAME_REWARD;
      } else {
        return new Response(
          JSON.stringify({ status: "error", error: "Invalid claimType" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const { signature, nonce, deadline } = await generateClaimSignature(
          user.wallet_address,
          amount,
          contractClaimType,
          contractAddress,
          signerPrivateKey
        );

        return new Response(
          JSON.stringify({
            status: "success",
            data: {
              signature,
              amount: amount.toString(),
              claimType: contractClaimType,
              nonce,
              deadline,
              contractAddress,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Signature generation failed:", error);
        return new Response(
          JSON.stringify({ status: "error", error: "Failed to generate signature" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // POST /claim/record - Record a successful claim (called after on-chain tx)
    if (req.method === "POST" && path === "/record") {
      const body = await req.json();
      const { claimType, amount, txHash } = body as {
        claimType: "daily_bonus" | "game_reward";
        amount: string;
        txHash: string;
      };

      if (!claimType || !amount || !txHash) {
        return new Response(
          JSON.stringify({ status: "error", error: "claimType, amount, and txHash are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenAddress = Deno.env.get("REWARD_TOKEN_ADDRESS") || "";

      // Record the claim transaction
      const { data: transaction, error: txError } = await supabase
        .from("claim_transactions")
        .insert({
          user_id: user.id,
          claim_type: claimType,
          amount,
          token_address: tokenAddress,
          tx_hash: txHash,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) {
        console.error("Failed to record transaction:", txError);
        return new Response(
          JSON.stringify({ status: "error", error: "Failed to record transaction" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If daily bonus, record in daily_bonus_claims
      if (claimType === "daily_bonus") {
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("daily_bonus_claims").insert({
          user_id: user.id,
          claim_date: today,
          amount,
          transaction_id: transaction.id,
        });
      }

      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            claimId: transaction.id,
            message: "Claim recorded successfully",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Claim error:", error);
    return new Response(
      JSON.stringify({ status: "error", error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
