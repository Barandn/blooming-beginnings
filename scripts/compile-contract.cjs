/**
 * Compile TokenClaim Contract using solc
 * Outputs ABI and bytecode to artifacts folder
 */

const solc = require("solc");
const fs = require("fs");
const path = require("path");

// Read contract source
const contractPath = path.join(__dirname, "../contracts/TokenClaim.sol");
const contractSource = fs.readFileSync(contractPath, "utf8");

// OpenZeppelin imports path
const nodeModulesPath = path.join(__dirname, "../node_modules");

// Find imports callback
function findImports(importPath) {
  try {
    let fullPath;
    if (importPath.startsWith("@openzeppelin/")) {
      fullPath = path.join(nodeModulesPath, importPath);
    } else {
      fullPath = path.join(__dirname, "../contracts", importPath);
    }
    return { contents: fs.readFileSync(fullPath, "utf8") };
  } catch (e) {
    return { error: `File not found: ${importPath}` };
  }
}

// Compiler input
const input = {
  language: "Solidity",
  sources: {
    "TokenClaim.sol": {
      content: contractSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

console.log("🔨 Compiling TokenClaim.sol...\n");

// Compile
const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

// Check for errors
if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === "error");
  if (errors.length > 0) {
    console.error("❌ Compilation errors:");
    errors.forEach((e) => console.error(e.formattedMessage));
    process.exit(1);
  }
  // Show warnings
  output.errors
    .filter((e) => e.severity === "warning")
    .forEach((e) => console.warn("⚠️", e.message));
}

// Extract contract
const contract = output.contracts["TokenClaim.sol"]["TokenClaim"];

if (!contract) {
  console.error("❌ TokenClaim contract not found in output");
  process.exit(1);
}

const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

// Create artifacts directory
const artifactsDir = path.join(__dirname, "../artifacts");
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Save ABI
const abiPath = path.join(artifactsDir, "TokenClaim.abi.json");
fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
console.log("✅ ABI saved to:", abiPath);

// Save bytecode
const bytecodePath = path.join(artifactsDir, "TokenClaim.bytecode.json");
fs.writeFileSync(
  bytecodePath,
  JSON.stringify({ bytecode: "0x" + bytecode }, null, 2)
);
console.log("✅ Bytecode saved to:", bytecodePath);

// Save combined artifact
const artifactPath = path.join(artifactsDir, "TokenClaim.json");
fs.writeFileSync(
  artifactPath,
  JSON.stringify(
    {
      contractName: "TokenClaim",
      abi: abi,
      bytecode: "0x" + bytecode,
    },
    null,
    2
  )
);
console.log("✅ Combined artifact saved to:", artifactPath);

console.log("\n🎉 Compilation successful!");
console.log("   ABI functions:", abi.length);
console.log("   Bytecode size:", Math.round(bytecode.length / 2), "bytes");
