import { ethers } from "hardhat";

async function main() {
  // Arc Testnet USDC Address
  const usdcAddress = "0x3600000000000000000000000000000000000000";

  console.log("Deploying FlipRush...");

  const FlipRush = await ethers.getContractFactory("FlipRush");
  const flipRush = await FlipRush.deploy(usdcAddress);

  await flipRush.waitForDeployment();

  console.log(`FlipRush deployed to: ${await flipRush.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
