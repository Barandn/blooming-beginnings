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

// Verification levels
export const VerificationLevel = {
  Orb: 'orb',
  Device: 'device',
} as const;

export type VerificationLevelType = typeof VerificationLevel[keyof typeof VerificationLevel];

// Verify command types
export interface VerifyCommandInput {
  action: string;
  signal?: string;
  verification_level?: VerificationLevelType;
}

export interface VerifyCommandResult {
  status: 'success' | 'error';
  proof?: string;
  merkle_root?: string;
  nullifier_hash?: string;
  verification_level?: VerificationLevelType;
  version?: number;
  error?: {
    code: string;
    message: string;
  };
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
 * Request World ID verification
 * Triggers the World App verification flow
 */
export async function requestVerification(
  action: string,
  signal?: string
): Promise<VerifyCommandResult> {
  const minikit = getMiniKit();

  try {
    const result = await minikit.commandsAsync.verify({
      action,
      signal,
      verification_level: 'orb' as any, // Enforce Orb-only
    });
    
    return {
      status: 'success',
      proof: (result.finalPayload as any)?.proof,
      merkle_root: (result.finalPayload as any)?.merkle_root,
      nullifier_hash: (result.finalPayload as any)?.nullifier_hash,
      verification_level: (result.finalPayload as any)?.verification_level,
    };
  } catch (error) {
    console.error('Verification request failed:', error);
    return {
      status: 'error',
      error: {
        code: 'request_failed',
        message: error instanceof Error ? error.message : 'Verification request failed',
      },
    };
  }
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
