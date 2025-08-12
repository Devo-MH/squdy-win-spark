const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const admin = process.env.ADMIN_ADDRESS;
  if (!privateKey || !rpcUrl || !admin) {
    throw new Error('Missing env: PRIVATE_KEY, SEPOLIA_RPC_URL, ADMIN_ADDRESS');
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { chainId: 11155111, name: 'sepolia' });
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await wallet.getBalance();
  if (balance.lt(ethers.utils.parseEther('0.001'))) {
    console.log('Warning: very low ETH balance. Deployment may fail.');
  }

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'SqudyTokenV2.sol', 'SqudyTokenV2.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const { abi, bytecode } = artifact;

  const name = process.env.TOKEN_NAME || 'SQUDY Token';
  const symbol = process.env.TOKEN_SYMBOL || 'SQUDY';
  const initialSupply = ethers.utils.parseUnits(process.env.INITIAL_SUPPLY || '1000000', 18);
  const cap = ethers.utils.parseUnits(process.env.SUPPLY_CAP || '1000000000', 18);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(name, symbol, admin, initialSupply, cap);
  console.log('Deploy tx:', contract.deployTransaction.hash);
  const receipt = await contract.deployTransaction.wait();
  console.log('Deployed at:', contract.address, 'block', receipt.blockNumber);
  console.log(JSON.stringify({ tokenAddress: contract.address }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


