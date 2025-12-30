/**
 * Token Distribution Service
 * Gasless Relayer for ERC20 Token Transfers on World Chain
 * Uses a master private key to execute transfers on behalf of users
 */

import { ethers } from 'ethers';
import { ACTIVE_CHAIN, TOKEN_CONFIG, ERROR_MESSAGES } from '../config/constants';

// ERC20 ABI (minimal - just transfer function)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Transaction result type
export interface TransferResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
  errorCode?: string;
}

// Distribution request type
export interface DistributionRequest {
  recipientAddress: string;
  amount: string; // Amount in wei
  claimType: 'daily_bonus' | 'game_reward' | 'referral';
  userId: string;
}

/**
 * Token Distribution Service Class
 * Manages gasless token transfers using a master wallet
 */
export class TokenDistributionService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private tokenContract: ethers.Contract;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);

    // Initialize wallet with private key from env
    const privateKey = process.env.DISTRIBUTOR_PRIVATE_KEY;
    if (!privateKey) {
      console.error('DISTRIBUTOR_PRIVATE_KEY not set');
      throw new Error('Distributor wallet not configured');
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Initialize token contract
    if (!TOKEN_CONFIG.tokenAddress) {
      console.warn('REWARD_TOKEN_ADDRESS not set - token distribution disabled');
    }

    this.tokenContract = new ethers.Contract(
      TOKEN_CONFIG.tokenAddress,
      ERC20_ABI,
      this.wallet
    );

    this.isInitialized = true;
  }

  /**
   * Check if service is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!TOKEN_CONFIG.tokenAddress;
  }

  /**
   * Get distributor wallet address
   */
  getDistributorAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get token contract address
   */
  getTokenAddress(): string {
    return TOKEN_CONFIG.tokenAddress;
  }

  /**
   * Check distributor wallet ETH balance for gas
   */
  async getEthBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Check distributor token balance
   */
  async getTokenBalance(): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Token distribution not configured');
    }
    const balance = await this.tokenContract.balanceOf(this.wallet.address);
    return balance.toString();
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(): Promise<number> {
    if (!this.isReady()) {
      return 18;
    }
    return await this.tokenContract.decimals();
  }

  /**
   * Validate recipient address
   */
  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Execute ERC20 transfer to recipient
   * This is the core gasless relayer function
   *
   * @param request - Distribution request with recipient and amount
   * @returns Transfer result with transaction hash
   */
  async executeTransfer(request: DistributionRequest): Promise<TransferResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Token distribution not configured',
        errorCode: 'not_configured',
      };
    }

    // Validate recipient address
    if (!this.validateAddress(request.recipientAddress)) {
      return {
        success: false,
        error: 'Invalid recipient address',
        errorCode: 'invalid_address',
      };
    }

    // Validate amount
    const amount = BigInt(request.amount);
    if (amount <= 0n) {
      return {
        success: false,
        error: 'Invalid amount',
        errorCode: 'invalid_amount',
      };
    }

    try {
      // Check distributor has sufficient token balance
      const balance = await this.tokenContract.balanceOf(this.wallet.address);
      if (BigInt(balance) < amount) {
        console.error('Insufficient distributor token balance', {
          balance: balance.toString(),
          required: request.amount,
        });
        return {
          success: false,
          error: ERROR_MESSAGES.INSUFFICIENT_BALANCE,
          errorCode: 'insufficient_balance',
        };
      }

      // Check distributor has sufficient ETH for gas
      const ethBalance = await this.provider.getBalance(this.wallet.address);
      const estimatedGas = await this.tokenContract.transfer.estimateGas(
        request.recipientAddress,
        amount
      );
      const feeData = await this.provider.getFeeData();
      const estimatedCost = estimatedGas * (feeData.gasPrice || 0n);

      if (ethBalance < estimatedCost) {
        console.error('Insufficient ETH for gas', {
          balance: ethBalance.toString(),
          required: estimatedCost.toString(),
        });
        return {
          success: false,
          error: 'Insufficient gas funds',
          errorCode: 'insufficient_gas',
        };
      }

      // Execute transfer
      console.log('Executing token transfer', {
        to: request.recipientAddress,
        amount: request.amount,
        claimType: request.claimType,
      });

      const tx = await this.tokenContract.transfer(
        request.recipientAddress,
        amount
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log('Token transfer confirmed', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      console.error('Token transfer failed:', error);

      // Handle specific error types
      if (error instanceof Error) {
        // Check for common error patterns
        if (error.message.includes('insufficient funds')) {
          return {
            success: false,
            error: 'Insufficient funds for transfer',
            errorCode: 'insufficient_funds',
          };
        }
        if (error.message.includes('nonce')) {
          return {
            success: false,
            error: 'Transaction nonce conflict - please retry',
            errorCode: 'nonce_error',
          };
        }
        if (error.message.includes('replacement fee')) {
          return {
            success: false,
            error: 'Transaction underpriced - please retry',
            errorCode: 'underpriced',
          };
        }
      }

      return {
        success: false,
        error: ERROR_MESSAGES.CLAIM_FAILED,
        errorCode: 'transfer_failed',
      };
    }
  }

  /**
   * Execute daily bonus distribution
   *
   * @param recipientAddress - Recipient wallet address
   * @param userId - User ID for logging
   * @returns Transfer result
   */
  async distributeDailyBonus(
    recipientAddress: string,
    userId: string
  ): Promise<TransferResult> {
    return this.executeTransfer({
      recipientAddress,
      amount: TOKEN_CONFIG.dailyBonusAmount,
      claimType: 'daily_bonus',
      userId,
    });
  }

  /**
   * Execute game reward distribution
   *
   * @param recipientAddress - Recipient wallet address
   * @param score - Game score
   * @param userId - User ID for logging
   * @returns Transfer result
   */
  async distributeGameReward(
    recipientAddress: string,
    score: number,
    userId: string
  ): Promise<TransferResult> {
    // Calculate reward based on score
    const rewardAmount = BigInt(score) * TOKEN_CONFIG.gameRewardMultiplier;

    return this.executeTransfer({
      recipientAddress,
      amount: rewardAmount.toString(),
      claimType: 'game_reward',
      userId,
    });
  }

  /**
   * Get transaction status by hash
   *
   * @param txHash - Transaction hash
   * @returns Transaction receipt or null if pending
   */
  async getTransactionStatus(txHash: string): Promise<{
    confirmed: boolean;
    blockNumber?: number;
    status?: number;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { confirmed: false };
      }

      return {
        confirmed: true,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return { confirmed: false };
    }
  }
}

// Singleton instance
let distributionServiceInstance: TokenDistributionService | null = null;

/**
 * Get Token Distribution Service instance
 * Uses singleton pattern for connection reuse
 */
export function getTokenDistributionService(): TokenDistributionService {
  if (!distributionServiceInstance) {
    distributionServiceInstance = new TokenDistributionService();
  }
  return distributionServiceInstance;
}

/**
 * Calculate token amount from display value
 *
 * @param displayAmount - Human-readable amount (e.g., "200")
 * @param decimals - Token decimals (default 18)
 * @returns Amount in wei as string
 */
export function parseTokenAmount(displayAmount: string, decimals: number = 18): string {
  return ethers.parseUnits(displayAmount, decimals).toString();
}

/**
 * Format token amount for display
 *
 * @param weiAmount - Amount in wei
 * @param decimals - Token decimals (default 18)
 * @returns Human-readable amount
 */
export function formatTokenAmount(weiAmount: string, decimals: number = 18): string {
  return ethers.formatUnits(weiAmount, decimals);
}
