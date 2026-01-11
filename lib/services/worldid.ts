/**
 * World ID Verification Service
 * Handles ZKP (Zero-Knowledge Proof) verification for human verification
 * Enforces Orb-only policy for maximum security
 */

import { WORLD_ID, ERROR_MESSAGES } from '../config/constants';

// Types for World ID verification
export interface WorldIDProof {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
}

export interface VerifyProofPayload {
  proof: WorldIDProof;
  action: string;
  signal?: string;
}

export interface VerifyCloudProofResponse {
  success: boolean;
  nullifier_hash?: string;
  error?: {
    code: string;
    message: string;
    attribute?: string;
  };
}

// World ID Error Codes
export const WORLD_ID_ERRORS = {
  INVALID_PROOF: 'invalid_proof',
  INVALID_MERKLE_ROOT: 'invalid_merkle_root',
  INVALID_NULLIFIER: 'invalid_nullifier_hash',
  ALREADY_VERIFIED: 'already_verified',
  EXPIRED_PROOF: 'expired_proof',
  INVALID_ACTION: 'invalid_action',
  INVALID_SIGNAL: 'invalid_signal',
} as const;

/**
 * Verify World ID proof using Worldcoin's cloud verification API
 * This is the server-side verification that validates ZKP proofs
 *
 * @param payload - The verification payload containing proof and action
 * @returns Verification result with success status and nullifier
 */
export async function verifyCloudProof(
  payload: VerifyProofPayload
): Promise<VerifyCloudProofResponse> {
  const appId = WORLD_ID.appId;

  if (!appId) {
    console.error('WORLD_APP_ID environment variable not set');
    return {
      success: false,
      error: {
        code: 'config_error',
        message: 'World ID app configuration missing',
      },
    };
  }

  try {
    // Call World ID verification endpoint
    const response = await fetch(`${WORLD_ID.verifyEndpoint}/${appId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proof: payload.proof.proof,
        merkle_root: payload.proof.merkle_root,
        nullifier_hash: payload.proof.nullifier_hash,
        action: payload.action,
        signal: payload.signal || '',
      }),
    });

    const data = await response.json() as {
      code?: string;
      detail?: string;
      attribute?: string;
    };

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.code || 'verification_failed',
          message: data.detail || 'Verification failed',
          attribute: data.attribute,
        },
      };
    }

    // Verification successful
    return {
      success: true,
      nullifier_hash: payload.proof.nullifier_hash,
    };
  } catch (error) {
    console.error('World ID verification error:', error);
    return {
      success: false,
      error: {
        code: 'network_error',
        message: 'Failed to connect to World ID verification service',
      },
    };
  }
}

/**
 * Verify that the proof uses Orb verification level
 * This enforces our strict Orb-only policy for anti-bot protection
 *
 * @param proof - The World ID proof object
 * @returns true if Orb verified, false otherwise
 */
export function isOrbVerified(proof: WorldIDProof): boolean {
  return proof.verification_level === 'orb';
}

/**
 * Validate World ID proof format before sending to verification API
 *
 * @param proof - The World ID proof object
 * @returns Validation result with error message if invalid
 */
export function validateProofFormat(proof: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!proof || typeof proof !== 'object') {
    return { valid: false, error: 'Proof object is required' };
  }

  const p = proof as Record<string, unknown>;

  // Check required fields
  if (!p.proof || typeof p.proof !== 'string') {
    return { valid: false, error: 'Proof field is required and must be a string' };
  }

  if (!p.merkle_root || typeof p.merkle_root !== 'string') {
    return { valid: false, error: 'Merkle root is required and must be a string' };
  }

  if (!p.nullifier_hash || typeof p.nullifier_hash !== 'string') {
    return { valid: false, error: 'Nullifier hash is required and must be a string' };
  }

  if (!p.verification_level || !['orb', 'device'].includes(p.verification_level as string)) {
    return { valid: false, error: 'Invalid verification level' };
  }

  // Validate hex string formats
  const hexRegex = /^0x[a-fA-F0-9]+$/;

  if (!hexRegex.test(p.merkle_root as string)) {
    return { valid: false, error: 'Invalid merkle root format' };
  }

  if (!hexRegex.test(p.nullifier_hash as string)) {
    return { valid: false, error: 'Invalid nullifier hash format' };
  }

  return { valid: true };
}

/**
 * Full verification flow with Orb-only enforcement
 * Combines format validation, Orb check, and cloud verification
 *
 * @param proof - The World ID proof
 * @param action - The action being verified
 * @param signal - Optional signal for the verification
 * @returns Complete verification result
 */
export async function verifyWorldIDWithOrbPolicy(
  proof: WorldIDProof,
  action: string,
  signal?: string
): Promise<{
  success: boolean;
  nullifier_hash?: string;
  error?: string;
  errorCode?: string;
}> {
  // Step 1: Validate proof format
  const formatValidation = validateProofFormat(proof);
  if (!formatValidation.valid) {
    return {
      success: false,
      error: formatValidation.error,
      errorCode: 'invalid_format',
    };
  }

  // Step 2: Enforce Orb-only policy
  if (!isOrbVerified(proof)) {
    return {
      success: false,
      error: ERROR_MESSAGES.NOT_ORB_VERIFIED,
      errorCode: 'not_orb_verified',
    };
  }

  // Step 3: Verify with World ID cloud service
  const verifyResult = await verifyCloudProof({
    proof,
    action,
    signal,
  });

  if (!verifyResult.success) {
    return {
      success: false,
      error: verifyResult.error?.message || ERROR_MESSAGES.VERIFICATION_FAILED,
      errorCode: verifyResult.error?.code,
    };
  }

  return {
    success: true,
    nullifier_hash: verifyResult.nullifier_hash,
  };
}

/**
 * Get human-readable error message for World ID error codes
 *
 * @param errorCode - The error code from World ID API
 * @returns Human-readable error message
 */
export function getWorldIDErrorMessage(errorCode: string): string {
  const errorMap: Record<string, string> = {
    [WORLD_ID_ERRORS.INVALID_PROOF]: 'The verification proof is invalid or corrupted.',
    [WORLD_ID_ERRORS.INVALID_MERKLE_ROOT]: 'The merkle root is outdated. Please try again.',
    [WORLD_ID_ERRORS.INVALID_NULLIFIER]: 'The nullifier hash is invalid.',
    [WORLD_ID_ERRORS.ALREADY_VERIFIED]: 'This action has already been verified with this World ID.',
    [WORLD_ID_ERRORS.EXPIRED_PROOF]: 'The proof has expired. Please generate a new one.',
    [WORLD_ID_ERRORS.INVALID_ACTION]: 'The action ID is invalid.',
    [WORLD_ID_ERRORS.INVALID_SIGNAL]: 'The signal parameter is invalid.',
  };

  return errorMap[errorCode] || ERROR_MESSAGES.VERIFICATION_FAILED;
}
