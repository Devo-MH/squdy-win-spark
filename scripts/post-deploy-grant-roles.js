import hre from 'hardhat';
const { ethers } = hre;

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const campaignManager = process.env.CAMPAIGN_MANAGER_ADDRESS;
  const relayer = process.env.RELAYER_ADDRESS || process.env.ADMIN_ADDRESS;
  if (!tokenAddress) throw new Error('TOKEN_ADDRESS is required');

  const token = await ethers.getContractAt('SqudyTokenV2', tokenAddress);
  const BURNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('BURNER_ROLE'));
  const FAUCET_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('FAUCET_ROLE'));
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
  const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSER_ROLE'));
  const RESCUER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('RESCUER_ROLE'));

  if (campaignManager) {
    const tx1 = await token.grantRole(BURNER_ROLE, campaignManager);
    await tx1.wait();
    console.log('Granted BURNER_ROLE to CampaignManager', campaignManager);
  }
  if (relayer) {
    const tx2 = await token.grantRole(FAUCET_ROLE, relayer);
    await tx2.wait();
    console.log('Granted FAUCET_ROLE to relayer', relayer);
  }
  if (process.env.GRANT_MINTER_TO) {
    const tx3 = await token.grantRole(MINTER_ROLE, process.env.GRANT_MINTER_TO);
    await tx3.wait();
    console.log('Granted MINTER_ROLE to', process.env.GRANT_MINTER_TO);
  }
  if (process.env.GRANT_PAUSER_TO) {
    const tx4 = await token.grantRole(PAUSER_ROLE, process.env.GRANT_PAUSER_TO);
    await tx4.wait();
    console.log('Granted PAUSER_ROLE to', process.env.GRANT_PAUSER_TO);
  }
  if (process.env.GRANT_RESCUER_TO) {
    const tx5 = await token.grantRole(RESCUER_ROLE, process.env.GRANT_RESCUER_TO);
    await tx5.wait();
    console.log('Granted RESCUER_ROLE to', process.env.GRANT_RESCUER_TO);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


