const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const rpc = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const admin = process.env.ADMIN_ADDRESS;
  const router = process.env.ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000';
  if (!pk || !rpc || !admin) throw new Error('Missing env (PRIVATE_KEY, RPC_URL, ADMIN_ADDRESS)');

  const provider = new ethers.providers.JsonRpcProvider(rpc, { chainId: 11155111, name: 'sepolia' });
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'SqudyTokenReal.sol', 'SqudyToken.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(router, admin);
  console.log('Deploy tx:', contract.deployTransaction.hash);
  const receipt = await contract.deployTransaction.wait();
  console.log('SqudyTokenReal deployed at:', contract.address, 'block', receipt.blockNumber);
  console.log(JSON.stringify({ tokenAddress: contract.address }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


