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
