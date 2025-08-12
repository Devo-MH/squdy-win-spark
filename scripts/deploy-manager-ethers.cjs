const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const token = process.env.SQUDY_TOKEN_ADDRESS;
  const admin = process.env.ADMIN_ADDRESS;
  if (!privateKey || !rpcUrl || !token || !admin) {
    throw new Error('Missing env: PRIVATE_KEY, RPC_URL, SQUDY_TOKEN_ADDRESS, ADMIN_ADDRESS');
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { chainId: 11155111, name: 'sepolia' });
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'AutomatedSqudyCampaignManager.sol', 'AutomatedSqudyCampaignManager.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const { abi, bytecode } = artifact;

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(token);
  console.log('Deploy tx:', contract.deployTransaction.hash);
  const receipt = await contract.deployTransaction.wait();
  console.log('Manager deployed at:', contract.address, 'block', receipt.blockNumber);

  // Grant roles to admin
  const keccak = ethers.utils.keccak256;
  const toUtf8 = ethers.utils.toUtf8Bytes;
  const ADMIN_ROLE = keccak(toUtf8('ADMIN_ROLE'));
  const OPERATOR_ROLE = keccak(toUtf8('OPERATOR_ROLE'));
  const tx1 = await contract.grantRole(ADMIN_ROLE, admin);
  await tx1.wait();
  const tx2 = await contract.grantRole(OPERATOR_ROLE, admin);
  await tx2.wait();
  console.log('Granted ADMIN and OPERATOR to', admin);

  console.log(JSON.stringify({ campaignManagerAddress: contract.address }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


