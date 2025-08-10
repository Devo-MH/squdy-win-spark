import hre from 'hardhat';
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  const name = process.env.TOKEN_NAME || 'SQUDY Token';
  const symbol = process.env.TOKEN_SYMBOL || 'SQUDY';
  const initial = ethers.utils.parseUnits(process.env.INITIAL_SUPPLY || '1000000', 18); // 1M
  const cap = ethers.utils.parseUnits(process.env.SUPPLY_CAP || '1000000000', 18); // 1B

  console.log('Deploying SqudyTokenV2 with:');
  console.log({ admin, name, symbol, initial: initial.toString(), cap: cap.toString() });

  const Factory = await ethers.getContractFactory('SqudyTokenV2');
  const token = await Factory.deploy(name, symbol, admin, initial, cap);
  await token.deployed();

  console.log('SqudyTokenV2 deployed at:', token.address);

  // Optional: set faucet max per tx
  if (process.env.FAUCET_MAX_PER_TX) {
    const tx = await token.setFaucetMaxPerTx(ethers.utils.parseUnits(process.env.FAUCET_MAX_PER_TX, 18));
    await tx.wait();
    console.log('Faucet max per tx set to', process.env.FAUCET_MAX_PER_TX);
  }

  // Output addresses for CI/console
  console.log(JSON.stringify({ tokenAddress: token.address }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


