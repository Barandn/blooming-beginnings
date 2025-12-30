/**
 * Payment Verification Service
 * Verifies World App payments on blockchain before granting access
 */

import { ethers } from 'ethers';
import { WORLD_CHAIN, BARN_GAME_CONFIG, ACTIVE_CHAIN } from '../config/constants';

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = 'Transfer(address,address,uint256)';

// Minimum confirmations required for payment
const MIN_CONFIRMATIONS = 2;

// Payment verification result
export interface PaymentVerificationResult {
  verified: boolean;
  error?: string;
  errorCode?: 'invalid_tx' | 'wrong_recipient' | 'insufficient_amount' | 'wrong_token' | 'pending' | 'network_error';
  txHash?: string;
  from?: string;
  to?: string;
  amount?: string;
  tokenSymbol?: string;
  confirmations?: number;
}

// Token addresses on World Chain
const TOKEN_ADDRESSES: Record<string, string> = {
  WLD: BARN_GAME_CONFIG.tokenAddresses.WLD.toLowerCase(),
  USDC: BARN_GAME_CONFIG.tokenAddresses.USDC.toLowerCase(),
};

// Expected prices (in token decimals)
const EXPECTED_PRICES: Record<string, bigint> = {
  WLD: ethers.parseUnits(BARN_GAME_CONFIG.purchasePriceWLD, 18), // WLD has 18 decimals
  USDC: ethers.parseUnits(BARN_GAME_CONFIG.purchasePriceUSDC, 6), // USDC has 6 decimals
};

/**
 * Get provider for World Chain
 */
function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);
}

/**
 * Verify a World App payment transaction
 *
 * @param transactionId - Transaction hash from World App payment
 * @param expectedRecipient - Expected recipient wallet address
 * @param expectedToken - Expected token symbol (WLD or USDC)
 * @returns Verification result
 */
export async function verifyPaymentTransaction(
  transactionId: string,
  expectedRecipient: string,
  expectedToken: 'WLD' | 'USDC'
): Promise<PaymentVerificationResult> {
  // Validate transaction ID format
  if (!transactionId || !/^0x[a-fA-F0-9]{64}$/.test(transactionId)) {
    return {
      verified: false,
      error: 'Invalid transaction ID format',
      errorCode: 'invalid_tx',
    };
  }

  // Validate recipient address
  if (!expectedRecipient || !ethers.isAddress(expectedRecipient)) {
    return {
      verified: false,
      error: 'Invalid recipient address configuration',
      errorCode: 'wrong_recipient',
    };
  }

  const recipientLower = expectedRecipient.toLowerCase();
  const expectedTokenAddress = TOKEN_ADDRESSES[expectedToken];
  const expectedAmount = EXPECTED_PRICES[expectedToken];

  try {
    const provider = getProvider();

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionId);

    if (!receipt) {
      return {
        verified: false,
        error: 'Transaction not found or still pending',
        errorCode: 'pending',
        txHash: transactionId,
      };
    }

    // Check if transaction was successful
    if (receipt.status !== 1) {
      return {
        verified: false,
        error: 'Transaction failed on chain',
        errorCode: 'invalid_tx',
        txHash: transactionId,
      };
    }

    // Check confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    if (confirmations < MIN_CONFIRMATIONS) {
      return {
        verified: false,
        error: `Transaction needs ${MIN_CONFIRMATIONS} confirmations, has ${confirmations}`,
        errorCode: 'pending',
        txHash: transactionId,
        confirmations,
      };
    }

    // Parse ERC20 Transfer events from logs
    const transferInterface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]);

    let foundValidTransfer = false;
    let transferFrom = '';
    let transferTo = '';
    let transferAmount = BigInt(0);
    let foundTokenSymbol = '';

    for (const log of receipt.logs) {
      const logAddress = log.address.toLowerCase();

      // Check if this is a log from one of our expected tokens
      if (logAddress !== expectedTokenAddress) {
        continue;
      }

      try {
        const parsed = transferInterface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed && parsed.name === 'Transfer') {
          const [from, to, value] = parsed.args;

          // Check if recipient matches
          if (to.toLowerCase() === recipientLower) {
            transferFrom = from;
            transferTo = to;
            transferAmount = value;
            foundTokenSymbol = expectedToken;

            // Check if amount is sufficient
            if (value >= expectedAmount) {
              foundValidTransfer = true;
              break;
            }
          }
        }
      } catch {
        // Not a Transfer event or parsing error, skip
        continue;
      }
    }

    if (!foundValidTransfer) {
      // Check if we found any transfer
      if (transferTo && transferTo.toLowerCase() === recipientLower) {
        // Found transfer to correct recipient but wrong amount
        return {
          verified: false,
          error: `Insufficient payment amount. Expected ${BARN_GAME_CONFIG[expectedToken === 'WLD' ? 'purchasePriceWLD' : 'purchasePriceUSDC']} ${expectedToken}`,
          errorCode: 'insufficient_amount',
          txHash: transactionId,
          from: transferFrom,
          to: transferTo,
          amount: ethers.formatUnits(transferAmount, expectedToken === 'WLD' ? 18 : 6),
          tokenSymbol: foundTokenSymbol,
          confirmations,
        };
      }

      return {
        verified: false,
        error: 'No valid token transfer found to the expected recipient',
        errorCode: 'wrong_recipient',
        txHash: transactionId,
        confirmations,
      };
    }

    // Payment verified successfully!
    return {
      verified: true,
      txHash: transactionId,
      from: transferFrom,
      to: transferTo,
      amount: ethers.formatUnits(transferAmount, expectedToken === 'WLD' ? 18 : 6),
      tokenSymbol: foundTokenSymbol,
      confirmations,
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      verified: false,
      error: 'Failed to verify payment on blockchain',
      errorCode: 'network_error',
      txHash: transactionId,
    };
  }
}

/**
 * Quick check if transaction exists (without full verification)
 * Useful for immediate feedback while waiting for confirmations
 */
export async function checkTransactionExists(
  transactionId: string
): Promise<{ exists: boolean; pending: boolean; error?: string }> {
  if (!transactionId || !/^0x[a-fA-F0-9]{64}$/.test(transactionId)) {
    return { exists: false, pending: false, error: 'Invalid transaction ID' };
  }

  try {
    const provider = getProvider();
    const tx = await provider.getTransaction(transactionId);

    if (!tx) {
      return { exists: false, pending: false };
    }

    const receipt = await provider.getTransactionReceipt(transactionId);
    return {
      exists: true,
      pending: !receipt || receipt.status === null,
    };
  } catch (error) {
    console.error('Transaction check error:', error);
    return { exists: false, pending: false, error: 'Network error' };
  }
}
