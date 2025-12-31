/**
 * MiniKit Client Integration
 * Handles World App MiniKit SDK integration for the frontend
 */

import {
  MiniKit,
  VerificationLevel as MiniKitVerificationLevel,
  Tokens,
  tokenToDecimals,
  type PayCommandInput as SDKPayCommandInput,
} from '@worldcoin/minikit-js';

// Re-export for use in other modules
export { Tokens, tokenToDecimals };

// Re-export SDK PayCommandInput type for proper type safety
export type PayCommandInput = SDKPayCommandInput;

// Check if MiniKit is available (running inside World App)
export function isMiniKitAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  // Use MiniKit SDK's isInstalled method which checks if running inside World App
  return MiniKit.isInstalled();
}

// Get MiniKit instance - returns the MiniKit SDK
export function getMiniKit() {
  if (!MiniKit.isInstalled()) {
    throw new Error('MiniKit is not available. Please open this app in World App.');
  }
  return MiniKit;
}

// Types for MiniKit
interface MiniKitInstance {
  isInstalled: () => boolean;
  commandsAsync: {
    verify: (payload: VerifyCommandInput) => Promise<VerifyCommandResult>;
    walletAuth: (payload: WalletAuthInput) => Promise<WalletAuthResult>;
    pay: (payload: PayCommandInput) => Promise<PayCommandResult>;
    sendTransaction: (payload: SendTransactionInput) => Promise<SendTransactionResult>;
  };
  subscribe: (event: string, callback: (payload: unknown) => void) => void;
  unsubscribe: (event: string) => void;
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

// Pay command types - Using SDK's PayCommandInput (re-exported above)

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

  const payload: VerifyCommandInput = {
    action,
    signal,
    verification_level: VerificationLevel.Orb, // Enforce Orb-only
  };

  try {
    const result = await minikit.commandsAsync.verify(payload);
    return result;
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

  const payload: WalletAuthInput = {
    nonce,
    statement: 'Sign in to Blooming Beginnings',
  };

  try {
    const result = await minikit.commandsAsync.walletAuth(payload);
    return result;
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
