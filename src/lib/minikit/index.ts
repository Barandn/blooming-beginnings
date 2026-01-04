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

    const payload = result.finalPayload as { message?: string; signature?: string; address?: string };
    
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
    // Note: MiniKit expects numeric types for uint256/uint8 args
    // amount should be string (large number), claimType and deadline as numbers
    const result = await minikit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: params.contractAddress,
          abi: TOKEN_CLAIM_ABI,
          functionName: 'claimTokens',
          args: [
            params.amount, // uint256 - keep as string for large numbers
            Number(params.claimType), // uint8 - convert to number
            Number(params.deadline), // uint256 - convert to number (timestamp fits in JS number)
            params.signature, // bytes - keep as hex string
          ],
        },
      ],
    });

    const payload = result.finalPayload as { status?: string; transaction_id?: string; error_code?: string; error_message?: string };

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

// Note: Use claimDailyBonus and claimGameReward from './api' for the full gasless flow
// These functions are kept for direct MiniKit transaction sending if you already have signature data
