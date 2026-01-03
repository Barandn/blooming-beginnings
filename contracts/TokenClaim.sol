// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenClaim
 * @notice Gasless token claim contract for World App Mini Apps
 * @dev Users call this contract via MiniKit sendTransaction, World App sponsors gas
 */
contract TokenClaim is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Token to be distributed
    IERC20 public immutable rewardToken;

    // Backend signer address (validates claim requests)
    address public signer;

    // Nonce tracking per user (replay protection)
    mapping(address => uint256) public nonces;

    // Used signatures (additional replay protection)
    mapping(bytes32 => bool) public usedSignatures;

    // Claim types
    enum ClaimType { DAILY_BONUS, GAME_REWARD }

    // Events
    event TokensClaimed(
        address indexed user,
        uint256 amount,
        ClaimType claimType,
        uint256 nonce
    );
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event TokensWithdrawn(address indexed token, uint256 amount);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // Errors
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error DeadlineExpired();
    error InvalidAmount();
    error ZeroAddress();
    error InsufficientBalance();

    /**
     * @notice Constructor
     * @param _rewardToken Address of the ERC20 token to distribute
     * @param _signer Backend signer address for claim verification
     */
    constructor(address _rewardToken, address _signer) Ownable(msg.sender) {
        if (_rewardToken == address(0) || _signer == address(0)) {
            revert ZeroAddress();
        }
        rewardToken = IERC20(_rewardToken);
        signer = _signer;
    }

    /**
     * @notice Claim tokens (daily bonus or game reward)
     * @dev Called by users via MiniKit sendTransaction - World App sponsors gas
     * @param amount Amount of tokens to claim (in wei)
     * @param claimType Type of claim (0 = daily bonus, 1 = game reward)
     * @param deadline Timestamp after which signature is invalid
     * @param signature Backend-generated signature authorizing this claim
     */
    function claimTokens(
        uint256 amount,
        ClaimType claimType,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        // Validate deadline
        if (block.timestamp > deadline) {
            revert DeadlineExpired();
        }

        // Validate amount
        if (amount == 0) {
            revert InvalidAmount();
        }

        // Get current nonce for user
        uint256 currentNonce = nonces[msg.sender];

        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                uint8(claimType),
                currentNonce,
                deadline,
                block.chainid,
                address(this)
            )
        );

        // Check signature not already used
        if (usedSignatures[messageHash]) {
            revert SignatureAlreadyUsed();
        }

        // Verify signature
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);

        if (recoveredSigner != signer) {
            revert InvalidSignature();
        }

        // Check contract has sufficient balance
        if (rewardToken.balanceOf(address(this)) < amount) {
            revert InsufficientBalance();
        }

        // Mark signature as used
        usedSignatures[messageHash] = true;

        // Increment nonce
        nonces[msg.sender] = currentNonce + 1;

        // Transfer tokens
        rewardToken.safeTransfer(msg.sender, amount);

        emit TokensClaimed(msg.sender, amount, claimType, currentNonce);
    }

    /**
     * @notice Get user's current nonce
     * @param user Address to check
     * @return Current nonce for the user
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @notice Check if a signature has been used
     * @param messageHash Hash of the signed message
     * @return True if signature has been used
     */
    function isSignatureUsed(bytes32 messageHash) external view returns (bool) {
        return usedSignatures[messageHash];
    }

    /**
     * @notice Get contract's token balance
     * @return Current token balance
     */
    function getTokenBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    // ============ Admin Functions ============

    /**
     * @notice Update the signer address
     * @param newSigner New backend signer address
     */
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) {
            revert ZeroAddress();
        }
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Withdraw tokens (for rebalancing or migration)
     * @param amount Amount to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert InvalidAmount();
        }
        rewardToken.safeTransfer(owner(), amount);
        emit TokensWithdrawn(address(rewardToken), amount);
    }

    /**
     * @notice Emergency withdraw any ERC20 token
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            revert ZeroAddress();
        }
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }
}
