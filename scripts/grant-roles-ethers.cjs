const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  const manager = process.env.CAMPAIGN_MANAGER_ADDRESS;
  const relayer = process.env.RELAYER_ADDRESS;
  if (!tokenAddress || !rpcUrl || !pk) throw new Error('Missing env');

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, { chainId: 11155111, name: 'sepolia' });
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'SqudyTokenV2.sol', 'SqudyTokenV2.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const token = new ethers.Contract(tokenAddress, artifact.abi, wallet);

  const keccak = ethers.utils.keccak256;
  const toUtf8 = ethers.utils.toUtf8Bytes;
  const BURNER_ROLE = keccak(toUtf8('BURNER_ROLE'));
  const FAUCET_ROLE = keccak(toUtf8('FAUCET_ROLE'));

  if (manager) {
    const tx1 = await token.grantRole(BURNER_ROLE, manager);
    await tx1.wait();
    console.log('Granted BURNER_ROLE to', manager);
  }
  if (relayer) {
    const tx2 = await token.grantRole(FAUCET_ROLE, relayer);
    await tx2.wait();
    console.log('Granted FAUCET_ROLE to', relayer);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


