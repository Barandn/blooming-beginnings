/**
 * Deploy TokenClaim Contract to World Chain
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... REWARD_TOKEN=0x... SIGNER_ADDRESS=0x... npx hardhat run scripts/deploy-claim-contract.cjs --network worldchain
 *
 * Or for testnet:
 *   DEPLOYER_PRIVATE_KEY=0x... REWARD_TOKEN=0x... SIGNER_ADDRESS=0x... npx hardhat run scripts/deploy-claim-contract.cjs --network worldchainTestnet
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TokenClaim Contract to World Chain...\n");

  // Get environment variables
  const rewardTokenAddress = process.env.REWARD_TOKEN;
  const signerAddress = process.env.SIGNER_ADDRESS;

  // Validate inputs
  if (!rewardTokenAddress) {
    throw new Error("❌ REWARD_TOKEN environment variable is required");
  }
  if (!signerAddress) {
    throw new Error("❌ SIGNER_ADDRESS environment variable is required");
  }

  // Validate addresses
  if (!hre.ethers.isAddress(rewardTokenAddress)) {
    throw new Error("❌ Invalid REWARD_TOKEN address");
  }
  if (!hre.ethers.isAddress(signerAddress)) {
    throw new Error("❌ Invalid SIGNER_ADDRESS address");
  }

  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("📋 Deployment Configuration:");
  console.log("   Network:", hre.network.name);
  console.log("   Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("   Reward Token:", rewardTokenAddress);
  console.log("   Signer:", signerAddress);
  console.log("");

  // Check balance
  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH for gas");
  }

  // Deploy contract
  console.log("📦 Compiling and deploying...");

  const TokenClaim = await hre.ethers.getContractFactory("TokenClaim");
  const tokenClaim = await TokenClaim.deploy(rewardTokenAddress, signerAddress);

  await tokenClaim.waitForDeployment();

  const contractAddress = await tokenClaim.getAddress();
  const deployTx = tokenClaim.deploymentTransaction();

  console.log("\n✅ TokenClaim Contract Deployed Successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Transaction Hash:", deployTx?.hash);
  console.log("⛽ Gas Used:", deployTx?.gasLimit?.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // World Chain Explorer links
  const isMainnet = hre.network.name === "worldchain";
  const explorerBase = isMainnet
    ? "https://worldscan.org"
    : "https://worldchain-sepolia.explorer.alchemy.com";

  console.log("\n🔍 View on Explorer:");
  console.log(`   ${explorerBase}/address/${contractAddress}`);

  console.log("\n📝 Next Steps:");
  console.log("   1. Add to .env: CLAIM_CONTRACT_ADDRESS=" + contractAddress);
  console.log("   2. Send reward tokens to the contract");
  console.log("   3. Add contract to World App Developer Portal (Advanced → Allowed Contracts)");
  console.log("");

  // Return deployment info
  return {
    contractAddress,
    transactionHash: deployTx?.hash,
    network: hre.network.name,
    rewardToken: rewardTokenAddress,
    signer: signerAddress,
  };
}

main()
  .then((result) => {
    console.log("🎉 Deployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
