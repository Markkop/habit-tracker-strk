import path from "path";
import { execSync } from "child_process";
import yargs from "yargs";
import { green, red, yellow } from "./helpers/colorize-log";
import deployedContracts from "../../nextjs/contracts/deployedContracts";

function main() {
  // Parse command line arguments
  const argv = yargs(process.argv.slice(2))
    .option("network", {
      type: "string",
      description: "Specify the network mainnet or sepolia",
      demandOption: true,
    })
    .parseSync();

  const network = argv.network;

  if (network !== "sepolia" && network !== "mainnet") {
    console.error(
      `Unsupported network: ${network}. Please use 'sepolia' or 'mainnet'.`
    );
    process.exit(1);
  }

  const contractsToVerify = deployedContracts[network];

  if (!contractsToVerify) {
    console.error(`No deployed contracts found for network: ${network}`);
    process.exit(1);
  }

  // Change to the contracts directory
  const contractsDir = path.resolve(__dirname, "../contracts");
  process.chdir(contractsDir);

  // Verify each contract
  Object.entries(contractsToVerify).forEach(
    ([contractName, contractInfo]: [string, any]) => {
      const { address, abi } = contractInfo;

      // Find the contract implementation that matches the contractName
      const contractImpl = abi.find(
        (item) => item.type === "impl" && item.name && item.name.includes(contractName)
      );

      if (!contractImpl) {
        console.error(red(`Failed to find Contract implementation for ${contractName}`));
        return;
      }

      // Extract the contract name from the impl name (remove "Impl" suffix)
      const contract = contractImpl.name.replace("Impl", "");

      console.log(yellow(`Verifying ${contractName} on ${network}...`));
      try {
        execSync(
          `sncast verify --contract-address ${address} --contract-name ${contract} --network ${network} --verifier walnut --confirm-verification`,
          { stdio: "inherit" }
        );
        console.log(green("Successfully verified"), contractName);
      } catch (error) {
        console.error(red(`Failed to verify ${contractName}:`), error);
      }
    }
  );
  console.log(green("✅ Verification process completed."));
}

if (typeof module !== "undefined" && require.main === module) {
  main();
}
