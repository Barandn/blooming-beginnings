/**
 * MiniKit Client Integration
 * Handles World App MiniKit SDK integration for the frontend
 */

import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';

// Re-export for use in other modules
export { Tokens, tokenToDecimals };

// Check if MiniKit is available (running inside World App)
export function isMiniKitAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return MiniKit.isInstalled();
}

// Get MiniKit instance - returns the MiniKit SDK
export function getMiniKit() {
  if (!MiniKit.isInstalled()) {
    throw new Error('MiniKit is not available. Please open this app in World App.');
  }
  return MiniKit;
}

// Wallet auth types
export interface WalletAuthInput {
  nonce: string;
  expirationTime?: Date;
  statement?: string;
  requestId?: string;
}

export interface WalletAuthResult {
  status: 'success' | 'error';
  message?: string;
  signature?: string;
  address?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Pay command types
export interface PayCommandInput {
  reference: string;
  to: string;
  tokens: Array<{
    symbol: Tokens;
    token_amount: string;
  }>;
  description?: string;
}

export interface PayCommandResult {
  status: 'success' | 'error';
  transaction_id?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Send transaction types
export interface SendTransactionInput {
  transaction: Array<{
    address: string;
    abi: unknown[];
    functionName: string;
    args: unknown[];
  }>;
}

export interface SendTransactionResult {
  status: 'success' | 'error';
  transaction_id?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Request wallet authentication
 * Gets user's wallet address with signature
 */
export async function requestWalletAuth(nonce: string): Promise<WalletAuthResult> {
  const minikit = getMiniKit();

  try {
    const result = await minikit.commandsAsync.walletAuth({
      nonce,
      statement: 'Sign in to Blooming Beginnings',
    });
    
    const payload = result.finalPayload as any;
    
    return {
      status: 'success',
      message: payload?.message,
      signature: payload?.signature,
      address: payload?.address,
    };
  } catch (error) {
    console.error('Wallet auth request failed:', error);
    return {
      status: 'error',
      error: {
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Wallet auth request failed',
      },
    };
  }
}

/**
 * Check if running inside World App
 */
export function isInWorldApp(): boolean {
  if (typeof window === 'undefined') return false;
  return MiniKit.isInstalled();
}

// TokenClaim contract ABI (only claimTokens function needed)
export const TOKEN_CLAIM_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint8', name: 'claimType', type: 'uint8' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'claimTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// Claim types
export enum ClaimType {
  DAILY_BONUS = 0,
  GAME_REWARD = 1,
}

// Claim parameters from backend
export interface ClaimParams {
  amount: string;
  claimType: ClaimType;
  deadline: number;
  signature: string;
  contractAddress: string;
}

/**
 * Send transaction to claim tokens (gasless via World App)
 * World App sponsors the gas fee for verified users
 *
 * @param params Claim parameters from backend signature endpoint
 * @returns Transaction result
 */
export async function claimTokens(params: ClaimParams): Promise<SendTransactionResult> {
  const minikit = getMiniKit();

  try {
    const result = await minikit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: params.contractAddress,
          abi: TOKEN_CLAIM_ABI,
          functionName: 'claimTokens',
          args: [
            params.amount,
            params.claimType.toString(),
            params.deadline.toString(),
            params.signature,
          ],
        },
      ],
    });

    const payload = result.finalPayload as any;

    if (payload?.status === 'success') {
      return {
        status: 'success',
        transaction_id: payload.transaction_id,
      };
    }

    return {
      status: 'error',
      error: {
        code: payload?.error_code || 'transaction_failed',
        message: payload?.error_message || 'Transaction failed',
      },
    };
  } catch (error) {
    console.error('Claim transaction failed:', error);
    return {
      status: 'error',
      error: {
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Transaction request failed',
      },
    };
  }
}

/**
 * Claim daily bonus (gasless)
 * 1. Gets signature from backend
 * 2. Sends transaction via MiniKit (World App sponsors gas)
 *
 * @param token JWT auth token
 * @returns Transaction result
 */
export async function claimDailyBonus(token: string): Promise<SendTransactionResult> {
  // Step 1: Get signature from backend
  const response = await fetch('/api/claim/signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ claimType: 'daily_bonus' }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      status: 'error',
      error: {
        code: 'signature_failed',
        message: error.error || 'Failed to get claim signature',
      },
    };
  }

  const signatureData = await response.json();

  if (!signatureData.success) {
    return {
      status: 'error',
      error: {
        code: 'signature_failed',
        message: signatureData.error || 'Failed to get claim signature',
      },
    };
  }

  // Step 2: Send transaction via MiniKit
  return claimTokens({
    amount: signatureData.amount,
    claimType: signatureData.claimType,
    deadline: signatureData.deadline,
    signature: signatureData.signature,
    contractAddress: signatureData.contractAddress,
  });
}

/**
 * Claim game reward (gasless)
 * 1. Gets signature from backend with score
 * 2. Sends transaction via MiniKit (World App sponsors gas)
 *
 * @param token JWT auth token
 * @param score Game score to claim reward for
 * @returns Transaction result
 */
export async function claimGameReward(
  token: string,
  score: number
): Promise<SendTransactionResult> {
  // Step 1: Get signature from backend
  const response = await fetch('/api/claim/signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ claimType: 'game_reward', score }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      status: 'error',
      error: {
        code: 'signature_failed',
        message: error.error || 'Failed to get claim signature',
      },
    };
  }

  const signatureData = await response.json();

  if (!signatureData.success) {
    return {
      status: 'error',
      error: {
        code: 'signature_failed',
        message: signatureData.error || 'Failed to get claim signature',
      },
    };
  }

  // Step 2: Send transaction via MiniKit
  return claimTokens({
    amount: signatureData.amount,
    claimType: signatureData.claimType,
    deadline: signatureData.deadline,
    signature: signatureData.signature,
    contractAddress: signatureData.contractAddress,
  });
}
