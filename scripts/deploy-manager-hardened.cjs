const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const rpc = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const token = process.env.SQUDY_TOKEN_ADDRESS;
  const admin = process.env.ADMIN_ADDRESS;
  if (!pk || !rpc || !token || !admin) throw new Error('Missing env');

  const provider = new ethers.providers.JsonRpcProvider(rpc, { chainId: 11155111, name: 'sepolia' });
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'AutomatedSqudyCampaignManager.sol', 'AutomatedSqudyCampaignManager.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const manager = await factory.deploy(token);
  console.log('Deploy tx:', manager.deployTransaction.hash);
  const receipt = await manager.deployTransaction.wait();
  console.log('Manager deployed at:', manager.address, 'block', receipt.blockNumber);

  // Grant roles to admin
  const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'));
  const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('OPERATOR_ROLE'));
  await (await manager.grantRole(ADMIN_ROLE, admin)).wait();
  await (await manager.grantRole(OPERATOR_ROLE, admin)).wait();
  console.log('Granted ADMIN and OPERATOR to', admin);

  console.log(JSON.stringify({ campaignManagerAddress: manager.address }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


