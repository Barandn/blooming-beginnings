/**
 * Deploy TokenClaim Contract to World Chain
 *
 * Usage:
 *   node scripts/deploy-claim-contract.mjs
 *
 * Required environment variables:
 *   DEPLOYER_PRIVATE_KEY - Private key of deployer wallet
 *   REWARD_TOKEN_ADDRESS - BNG token contract address
 *   CLAIM_SIGNER_PRIVATE_KEY - Private key for signing claims (backend will use this)
 *
 * Optional:
 *   NETWORK - "mainnet" or "testnet" (default: mainnet)
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Network configurations
const NETWORKS = {
  mainnet: {
    name: "World Chain Mainnet",
    rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
    chainId: 480,
    explorer: "https://worldscan.org",
  },
  testnet: {
    name: "World Chain Testnet",
    rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
    chainId: 4801,
    explorer: "https://worldchain-sepolia.explorer.alchemy.com",
  },
};

async function main() {
  console.log("🚀 TokenClaim Contract Deployment\n");
  console.log("━".repeat(50));

  // Load environment variables
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rewardTokenAddress = process.env.REWARD_TOKEN_ADDRESS;
  const signerPrivateKey = process.env.CLAIM_SIGNER_PRIVATE_KEY;
  const networkName = process.env.NETWORK || "mainnet";

  // Validate inputs
  if (!deployerPrivateKey) {
    throw new Error("❌ DEPLOYER_PRIVATE_KEY is required");
  }
  if (!rewardTokenAddress) {
    throw new Error("❌ REWARD_TOKEN_ADDRESS is required");
  }
  if (!signerPrivateKey) {
    throw new Error("❌ CLAIM_SIGNER_PRIVATE_KEY is required");
  }

  // Get network config
  const network = NETWORKS[networkName];
  if (!network) {
    throw new Error(`❌ Invalid network: ${networkName}. Use "mainnet" or "testnet"`);
  }

  // Get signer address from private key
  const signerWallet = new ethers.Wallet(signerPrivateKey);
  const signerAddress = signerWallet.address;

  console.log("\n📋 Configuration:");
  console.log(`   Network: ${network.name}`);
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   Reward Token: ${rewardTokenAddress}`);
  console.log(`   Claim Signer: ${signerAddress}`);

  // Connect to network
  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  const deployer = new ethers.Wallet(deployerPrivateKey, provider);

  console.log(`   Deployer: ${deployer.address}`);

  // Check deployer balance
  const balance = await provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH for gas");
  }

  // Load contract artifact
  const artifactPath = path.join(__dirname, "../artifacts/TokenClaim.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error("❌ Contract artifact not found. Run compile-contract.cjs first.");
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("\n📦 Deploying contract...");

  // Create contract factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);

  // Deploy
  const contract = await factory.deploy(rewardTokenAddress, signerAddress);
  console.log(`   Transaction sent: ${contract.deploymentTransaction()?.hash}`);

  // Wait for deployment
  console.log("   Waiting for confirmation...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n" + "━".repeat(50));
  console.log("✅ DEPLOYMENT SUCCESSFUL!");
  console.log("━".repeat(50));
  console.log(`\n📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Explorer: ${network.explorer}/address/${contractAddress}`);

  // Output .env format
  console.log("\n📝 Add to your .env file:");
  console.log("━".repeat(50));
  console.log(`CLAIM_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`CLAIM_SIGNER_PRIVATE_KEY=${signerPrivateKey}`);
  console.log("━".repeat(50));

  // Next steps
  console.log("\n📋 Next Steps:");
  console.log("   1. Add CLAIM_CONTRACT_ADDRESS to your .env / Lovable Secrets");
  console.log("   2. Add CLAIM_SIGNER_PRIVATE_KEY to your .env / Lovable Secrets");
  console.log("   3. Send BNG tokens to the contract address");
  console.log("   4. Add contract to World App Developer Portal:");
  console.log("      → Configuration → Advanced → Allowed Contracts");
  console.log(`      → Add: ${contractAddress}`);

  return {
    contractAddress,
    signerAddress,
    network: networkName,
  };
}

main()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
