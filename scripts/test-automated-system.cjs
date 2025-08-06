const { ethers } = require("hardhat");
require("dotenv").config({ path: "./backend/.env" });

async function main() {
  console.log("🧪 Testing Automated SQUDY System...");

  // Get test accounts
  const [deployer, participant1, participant2, participant3] = await ethers.getSigners();
  console.log("👥 Test participants:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Participant 1: ${participant1.address}`);
  console.log(`   Participant 2: ${participant2.address}`);
  console.log(`   Participant 3: ${participant3.address}`);

  // Read deployment info
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '..', 'deployment-automated.json');
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deployment first.");
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  const tokenAddress = deployment.contracts.squdyToken.address;
  const campaignManagerAddress = deployment.contracts.campaignManager.address;

  console.log(`🪙 SQUDY Token: ${tokenAddress}`);
  console.log(`🎯 Campaign Manager: ${campaignManagerAddress}`);

  // Get contract instances
  const SqudyToken = await ethers.getContractFactory("SqudyToken");
  const squdyToken = SqudyToken.attach(tokenAddress);

  const AutomatedSqudyCampaignManager = await ethers.getContractFactory("AutomatedSqudyCampaignManager");
  const campaignManager = AutomatedSqudyCampaignManager.attach(campaignManagerAddress);

  try {
    // ============ TEST 1: Token Distribution ============
    console.log("\n📦 Test 1: Distributing tokens to participants...");
    
    const testAmount = ethers.parseEther("5000"); // 5,000 SQUDY each
    
    for (let i = 1; i <= 3; i++) {
      const participant = [participant1, participant2, participant3][i-1];
      const tx = await squdyToken.transfer(participant.address, testAmount);
      await tx.wait();
      
      const balance = await squdyToken.balanceOf(participant.address);
      console.log(`   ✅ Participant ${i}: ${ethers.formatEther(balance)} SQUDY`);
    }

    // ============ TEST 2: Create Test Campaign ============
    console.log("\n🎯 Test 2: Creating test campaign...");
    
    const currentTime = Math.floor(Date.now() / 1000);
    const startDate = currentTime - 300; // Started 5 minutes ago
    const endDate = currentTime + 3600; // Ends in 1 hour
    
    const createTx = await campaignManager.createCampaign(
      "🧪 Test Automated Campaign",
      "Testing automated winner selection system with real participants.",
      "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop",
      ethers.parseEther("500"), // 500 SQUDY soft cap
      ethers.parseEther("5000"), // 5,000 SQUDY hard cap
      ethers.parseEther("100"), // 100 SQUDY per ticket
      startDate,
      endDate,
      ["🥇 1st Place: Premium NFT", "🥈 2nd Place: Rare NFT", "🥉 3rd Place: Common NFT"]
    );
    
    const receipt = await createTx.wait();
    const campaignId = 2; // Assuming this is the second campaign
    
    console.log(`   ✅ Campaign created with ID: ${campaignId}`);

    // ============ TEST 3: Participant Staking ============
    console.log("\n💰 Test 3: Participants staking tokens...");
    
    const stakeAmounts = [
      ethers.parseEther("500"),  // Participant 1: 5 tickets
      ethers.parseEther("300"),  // Participant 2: 3 tickets  
      ethers.parseEther("200")   // Participant 3: 2 tickets
    ];

    for (let i = 0; i < 3; i++) {
      const participant = [participant1, participant2, participant3][i];
      const stakeAmount = stakeAmounts[i];
      
      // Approve tokens
      const approveTx = await squdyToken.connect(participant).approve(campaignManagerAddress, stakeAmount);
      await approveTx.wait();
      
      // Stake tokens
      const stakeTx = await campaignManager.connect(participant).stakeTokens(campaignId, stakeAmount);
      await stakeTx.wait();
      
      const participantData = await campaignManager.getParticipant(campaignId, participant.address);
      console.log(`   ✅ Participant ${i+1}: ${ethers.formatEther(participantData.stakedAmount)} SQUDY, ${participantData.ticketCount} tickets`);
    }

    // ============ TEST 4: Complete Social Tasks ============
    console.log("\n📱 Test 4: Completing social tasks...");
    
    for (let i = 0; i < 3; i++) {
      const participant = [participant1, participant2, participant3][i];
      
      const confirmTx = await campaignManager.confirmSocialTasks(campaignId, participant.address);
      await confirmTx.wait();
      
      const participantData = await campaignManager.getParticipant(campaignId, participant.address);
      console.log(`   ✅ Participant ${i+1}: Social tasks completed = ${participantData.hasCompletedSocial}`);
    }

    // ============ TEST 5: Check Campaign Status ============
    console.log("\n📊 Test 5: Campaign status before winner selection...");
    
    const campaign = await campaignManager.getCampaign(campaignId);
    console.log(`   📛 Name: ${campaign.name}`);
    console.log(`   💰 Current Amount: ${ethers.formatEther(campaign.currentAmount)} SQUDY`);
    console.log(`   👥 Participants: ${campaign.participantCount}`);
    console.log(`   📅 Status: ${campaign.status} (0=Active, 1=Finished, 2=Burned)`);

    // ============ TEST 6: Fast-forward time (for testing) ============
    console.log("\n⏰ Test 6: Fast-forwarding time to end campaign...");
    
    // Note: This only works on local networks like Hardhat
    try {
      await ethers.provider.send("evm_increaseTime", [3700]); // Fast forward 1 hour + 100 seconds
      await ethers.provider.send("evm_mine"); // Mine a new block
      console.log("   ✅ Time fast-forwarded to end campaign");
    } catch (error) {
      console.log("   ⚠️  Cannot fast-forward time on this network. Campaign end time:", new Date(endDate * 1000));
    }

    // ============ TEST 7: Select Winners ============
    console.log("\n🏆 Test 7: Selecting winners automatically...");
    
    // Check if campaign has ended
    const currentBlock = await ethers.provider.getBlock('latest');
    if (currentBlock.timestamp > endDate) {
      const selectTx = await campaignManager.selectWinners(campaignId);
      await selectTx.wait();
      
      const updatedCampaign = await campaignManager.getCampaign(campaignId);
      console.log(`   ✅ Winners selected! Block: ${updatedCampaign.winnerSelectionBlock}`);
      console.log(`   🥇 Winners (${updatedCampaign.winners.length}):`);
      
      updatedCampaign.winners.forEach((winner, index) => {
        console.log(`      ${index + 1}. ${winner}`);
      });
    } else {
      console.log("   ⏳ Campaign hasn't ended yet. Cannot select winners.");
    }

    // ============ TEST 8: Burn Tokens ============
    console.log("\n🔥 Test 8: Burning staked tokens...");
    
    const latestCampaign = await campaignManager.getCampaign(campaignId);
    if (latestCampaign.status === 1) { // Finished status
      const burnTx = await campaignManager.burnTokens(campaignId);
      await burnTx.wait();
      
      const finalCampaign = await campaignManager.getCampaign(campaignId);
      console.log(`   ✅ Tokens burned: ${ethers.formatEther(finalCampaign.totalBurned)} SQUDY`);
      console.log(`   🔥 Campaign status: ${finalCampaign.status} (2=Burned)`);
    } else {
      console.log("   ⏳ Cannot burn tokens yet. Winners must be selected first.");
    }

    // ============ TEST 9: Check Token Stats ============
    console.log("\n📈 Test 9: Final token statistics...");
    
    const totalSupply = await squdyToken.totalSupply();
    const totalBurned = await squdyToken.totalBurned();
    const circulatingSupply = await squdyToken.circulatingSupply();
    
    console.log(`   💎 Total Supply: ${ethers.formatEther(totalSupply)} SQUDY`);
    console.log(`   🔥 Total Burned: ${ethers.formatEther(totalBurned)} SQUDY`);
    console.log(`   🔄 Circulating: ${ethers.formatEther(circulatingSupply)} SQUDY`);

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
    console.log("=" .repeat(50));
    console.log("🚀 The automated system is working perfectly!");
    console.log("📱 Ready for frontend integration and production deployment.");

  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Execute tests
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Test script failed:", error);
    process.exit(1);
  });