/**
 * Claim Signature Service
 * Generates signatures for gasless token claims via MiniKit sendTransaction
 */

import { ethers } from 'ethers';
import { ACTIVE_CHAIN, TOKEN_CONFIG } from '../config/constants';

// Claim types matching the contract enum
export enum ClaimType {
  DAILY_BONUS = 0,
  GAME_REWARD = 1,
}

// Signature response type
export interface ClaimSignatureResponse {
  success: boolean;
  signature?: string;
  amount?: string;
  claimType?: ClaimType;
  nonce?: number;
  deadline?: number;
  contractAddress?: string;
  error?: string;
}

// Claim request type
export interface ClaimRequest {
  userAddress: string;
  claimType: ClaimType;
  amount?: string; // For game rewards, calculated based on score
  score?: number; // For game rewards
}

/**
 * Get the claim contract address from environment
 */
export function getClaimContractAddress(): string {
  const address = process.env.CLAIM_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('CLAIM_CONTRACT_ADDRESS not configured');
  }
  return address;
}

/**
 * Get the signer wallet for claim signatures
 */
function getSignerWallet(): ethers.Wallet {
  const privateKey = process.env.CLAIM_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('CLAIM_SIGNER_PRIVATE_KEY not configured');
  }
  return new ethers.Wallet(privateKey);
}

/**
 * Fetch user's current nonce from the contract
 */
async function getUserNonce(userAddress: string): Promise<number> {
  const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);
  const contractAddress = getClaimContractAddress();

  // Minimal ABI for getNonce
  const abi = ['function getNonce(address user) view returns (uint256)'];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const nonce = await contract.getNonce(userAddress);
  return Number(nonce);
}

/**
 * Calculate amount based on claim type
 */
function calculateAmount(request: ClaimRequest): bigint {
  if (request.claimType === ClaimType.DAILY_BONUS) {
    return BigInt(TOKEN_CONFIG.dailyBonusAmount);
  }

  if (request.claimType === ClaimType.GAME_REWARD && request.score !== undefined) {
    return BigInt(request.score) * TOKEN_CONFIG.gameRewardMultiplier;
  }

  if (request.amount) {
    return BigInt(request.amount);
  }

  throw new Error('Unable to calculate claim amount');
}

/**
 * Generate a claim signature for a user
 *
 * @param request Claim request details
 * @returns Signature and claim parameters
 */
export async function generateClaimSignature(
  request: ClaimRequest
): Promise<ClaimSignatureResponse> {
  try {
    // Validate user address
    if (!ethers.isAddress(request.userAddress)) {
      return { success: false, error: 'Invalid user address' };
    }

    const contractAddress = getClaimContractAddress();
    const signer = getSignerWallet();

    // Get user's current nonce from contract
    const nonce = await getUserNonce(request.userAddress);

    // Calculate amount
    const amount = calculateAmount(request);

    // Set deadline (5 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 5 * 60;

    // Create message hash (must match contract's hashing)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint8', 'uint256', 'uint256', 'uint256', 'address'],
      [
        request.userAddress,
        amount,
        request.claimType,
        nonce,
        deadline,
        ACTIVE_CHAIN.chainId,
        contractAddress,
      ]
    );

    // Sign the message hash
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    return {
      success: true,
      signature,
      amount: amount.toString(),
      claimType: request.claimType,
      nonce,
      deadline,
      contractAddress,
    };
  } catch (error) {
    console.error('Failed to generate claim signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signature generation failed',
    };
  }
}

/**
 * Generate signature for daily bonus claim
 */
export async function generateDailyBonusSignature(
  userAddress: string
): Promise<ClaimSignatureResponse> {
  return generateClaimSignature({
    userAddress,
    claimType: ClaimType.DAILY_BONUS,
  });
}

/**
 * Generate signature for game reward claim
 */
export async function generateGameRewardSignature(
  userAddress: string,
  score: number
): Promise<ClaimSignatureResponse> {
  return generateClaimSignature({
    userAddress,
    claimType: ClaimType.GAME_REWARD,
    score,
  });
}
