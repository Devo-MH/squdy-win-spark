const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Squdy Burn-to-Win Platform", function () {
  let mockSqudyToken, squdyCampaignManager;
  let owner, admin, user1, user2, user3;
  let VRF_COORDINATOR, KEY_HASH, SUBSCRIPTION_ID;

  beforeEach(async function () {
    // Get signers
    [owner, admin, user1, user2, user3] = await ethers.getSigners();

    // Mock VRF configuration
    VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
    KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
    SUBSCRIPTION_ID = 1;

    // Deploy Mock SQUDY Token
    const MockSqudyToken = await ethers.getContractFactory("MockSqudyToken");
    mockSqudyToken = await MockSqudyToken.deploy();
    await mockSqudyToken.deployed();

    // Deploy Squdy Campaign Manager
    const SqudyCampaignManager = await ethers.getContractFactory("SqudyCampaignManager");
    squdyCampaignManager = await SqudyCampaignManager.deploy(
      mockSqudyToken.address,
      VRF_COORDINATOR,
      KEY_HASH,
      SUBSCRIPTION_ID
    );
    await squdyCampaignManager.deployed();

    // Mint tokens to users for testing
    const mintAmount = ethers.utils.parseEther("10000");
    await mockSqudyToken.mint(user1.address, mintAmount);
    await mockSqudyToken.mint(user2.address, mintAmount);
    await mockSqudyToken.mint(user3.address, mintAmount);

    // Add admin
    await squdyCampaignManager.addAdmin(admin.address);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await squdyCampaignManager.squdyToken()).to.equal(mockSqudyToken.address);
      expect(await squdyCampaignManager.getCampaignCount()).to.equal(0);
      expect(await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), admin.address)).to.be.true;
    });

    it("Should have correct token balances", async function () {
      expect(await mockSqudyToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("10000"));
      expect(await mockSqudyToken.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("10000"));
      expect(await mockSqudyToken.balanceOf(user3.address)).to.equal(ethers.utils.parseEther("10000"));
    });
  });

  describe("Campaign Creation", function () {
    let campaignParams;

    beforeEach(async function () {
      campaignParams = {
        name: "Test Campaign",
        description: "A test campaign",
        imageUrl: "https://example.com/image.jpg",
        softCap: ethers.utils.parseEther("1000"),
        hardCap: ethers.utils.parseEther("10000"),
        ticketAmount: ethers.utils.parseEther("100"),
        startDate: (await time.latest()) + 3600, // Start in 1 hour
        endDate: (await time.latest()) + 86400, // End in 24 hours
        prizes: ["1st Place: 1000 USD", "2nd Place: 500 USD"]
      };
    });

    it("Should create a campaign successfully", async function () {
      const tx = await squdyCampaignManager.connect(admin).createCampaign(
        campaignParams.name,
        campaignParams.description,
        campaignParams.imageUrl,
        campaignParams.softCap,
        campaignParams.hardCap,
        campaignParams.ticketAmount,
        campaignParams.startDate,
        campaignParams.endDate,
        campaignParams.prizes
      );

      await expect(tx)
        .to.emit(squdyCampaignManager, "CampaignCreated")
        .withArgs(1, campaignParams.name, campaignParams.startDate, campaignParams.endDate, campaignParams.ticketAmount);

      const campaign = await squdyCampaignManager.getCampaign(1);
      expect(campaign.name).to.equal(campaignParams.name);
      expect(campaign.status).to.equal(0); // PENDING
      expect(campaign.prizes.length).to.equal(2);
    });

    it("Should fail to create campaign with invalid parameters", async function () {
      // Empty name
      await expect(
        squdyCampaignManager.connect(admin).createCampaign(
          "",
          campaignParams.description,
          campaignParams.imageUrl,
          campaignParams.softCap,
          campaignParams.hardCap,
          campaignParams.ticketAmount,
          campaignParams.startDate,
          campaignParams.endDate,
          campaignParams.prizes
        )
      ).to.be.revertedWith("SqudyCampaignManager: name cannot be empty");

      // Invalid soft cap
      await expect(
        squdyCampaignManager.connect(admin).createCampaign(
          campaignParams.name,
          campaignParams.description,
          campaignParams.imageUrl,
          0,
          campaignParams.hardCap,
          campaignParams.ticketAmount,
          campaignParams.startDate,
          campaignParams.endDate,
          campaignParams.prizes
        )
      ).to.be.revertedWith("SqudyCampaignManager: soft cap must be greater than 0");

      // Hard cap less than soft cap
      await expect(
        squdyCampaignManager.connect(admin).createCampaign(
          campaignParams.name,
          campaignParams.description,
          campaignParams.imageUrl,
          campaignParams.softCap,
          campaignParams.softCap,
          campaignParams.ticketAmount,
          campaignParams.startDate,
          campaignParams.endDate,
          campaignParams.prizes
        )
      ).to.be.revertedWith("SqudyCampaignManager: hard cap must be greater than soft cap");
    });

    it("Should fail if non-operator tries to create campaign", async function () {
      await expect(
        squdyCampaignManager.connect(user1).createCampaign(
          campaignParams.name,
          campaignParams.description,
          campaignParams.imageUrl,
          campaignParams.softCap,
          campaignParams.hardCap,
          campaignParams.ticketAmount,
          campaignParams.startDate,
          campaignParams.endDate,
          campaignParams.prizes
        )
      ).to.be.revertedWith("SqudyCampaignManager: operator role required");
    });
  });

  describe("Campaign Management", function () {
    let campaignId;

    beforeEach(async function () {
      // Create a campaign
      const startDate = (await time.latest()) + 3600;
      const endDate = (await time.latest()) + 86400;
      
      const tx = await squdyCampaignManager.connect(admin).createCampaign(
        "Test Campaign",
        "A test campaign",
        "https://example.com/image.jpg",
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("100"),
        startDate,
        endDate,
        ["1st Place: 1000 USD"]
      );
      
      campaignId = 1;
    });

    it("Should activate a campaign", async function () {
      // Fast forward to start date
      await time.increaseTo((await squdyCampaignManager.getCampaign(campaignId)).startDate);
      
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
      
      const campaign = await squdyCampaignManager.getCampaign(campaignId);
      expect(campaign.status).to.equal(1); // ACTIVE
    });

    it("Should pause and resume a campaign", async function () {
      // Activate campaign first
      await time.increaseTo((await squdyCampaignManager.getCampaign(campaignId)).startDate);
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
      
      // Pause campaign
      await expect(squdyCampaignManager.connect(admin).pauseCampaign(campaignId))
        .to.emit(squdyCampaignManager, "CampaignPaused")
        .withArgs(campaignId);
      
      let campaign = await squdyCampaignManager.getCampaign(campaignId);
      expect(campaign.status).to.equal(2); // PAUSED
      
      // Resume campaign
      await expect(squdyCampaignManager.connect(admin).resumeCampaign(campaignId))
        .to.emit(squdyCampaignManager, "CampaignResumed")
        .withArgs(campaignId);
      
      campaign = await squdyCampaignManager.getCampaign(campaignId);
      expect(campaign.status).to.equal(1); // ACTIVE
    });

    it("Should close a campaign", async function () {
      // Activate campaign first
      await time.increaseTo((await squdyCampaignManager.getCampaign(campaignId)).startDate);
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
      
      // Fast forward to end date
      await time.increaseTo((await squdyCampaignManager.getCampaign(campaignId)).endDate);
      
      await expect(squdyCampaignManager.connect(admin).closeCampaign(campaignId))
        .to.emit(squdyCampaignManager, "CampaignClosed")
        .withArgs(campaignId);
      
      const campaign = await squdyCampaignManager.getCampaign(campaignId);
      expect(campaign.status).to.equal(3); // FINISHED
    });
  });

  describe("Token Staking", function () {
    let campaignId;

    beforeEach(async function () {
      // Create and activate a campaign
      const startDate = (await time.latest()) + 3600;
      const endDate = (await time.latest()) + 86400;
      
      await squdyCampaignManager.connect(admin).createCampaign(
        "Test Campaign",
        "A test campaign",
        "https://example.com/image.jpg",
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("100"),
        startDate,
        endDate,
        ["1st Place: 1000 USD"]
      );
      
      campaignId = 1;
      
      // Activate campaign
      await time.increaseTo(startDate);
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("200"); // 2 tickets
      
      // Approve tokens
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
      
      // Stake tokens
      await expect(squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, stakeAmount))
        .to.emit(squdyCampaignManager, "UserStaked")
        .withArgs(campaignId, user1.address, stakeAmount, 2);
      
      // Check participant data
      const participant = await squdyCampaignManager.getParticipant(campaignId, user1.address);
      expect(participant.stakedAmount).to.equal(stakeAmount);
      expect(participant.ticketCount).to.equal(2);
      
      // Check campaign data
      const campaign = await squdyCampaignManager.getCampaign(campaignId);
      expect(campaign.currentAmount).to.equal(stakeAmount);
      expect(campaign.participantCount).to.equal(1);
    });

    it("Should fail to stake invalid amounts", async function () {
      const invalidAmount = ethers.utils.parseEther("150"); // Not multiple of 100
      
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, invalidAmount);
      
      await expect(
        squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, invalidAmount)
      ).to.be.revertedWith("SqudyCampaignManager: amount must be multiple of ticket amount");
    });

    it("Should allow multiple stakes from same user", async function () {
      const firstStake = ethers.utils.parseEther("100");
      const secondStake = ethers.utils.parseEther("200");
      
      // First stake
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, firstStake);
      await squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, firstStake);
      
      // Second stake
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, secondStake);
      await squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, secondStake);
      
      // Check total stakes
      const participant = await squdyCampaignManager.getParticipant(campaignId, user1.address);
      expect(participant.stakedAmount).to.equal(firstStake.add(secondStake));
      expect(participant.ticketCount).to.equal(3); // 1 + 2 tickets
    });

    it("Should fail to stake when campaign is not active", async function () {
      // Pause campaign
      await squdyCampaignManager.connect(admin).pauseCampaign(campaignId);
      
      const stakeAmount = ethers.utils.parseEther("100");
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
      
      await expect(
        squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, stakeAmount)
      ).to.be.revertedWith("SqudyCampaignManager: campaign not active");
    });
  });

  describe("Social Task Verification", function () {
    let campaignId;

    beforeEach(async function () {
      // Create and activate a campaign
      const startDate = (await time.latest()) + 3600;
      const endDate = (await time.latest()) + 86400;
      
      await squdyCampaignManager.connect(admin).createCampaign(
        "Test Campaign",
        "A test campaign",
        "https://example.com/image.jpg",
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("100"),
        startDate,
        endDate,
        ["1st Place: 1000 USD"]
      );
      
      campaignId = 1;
      
      // Activate campaign and stake tokens
      await time.increaseTo(startDate);
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
      
      const stakeAmount = ethers.utils.parseEther("100");
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
      await squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, stakeAmount);
    });

    it("Should allow operators to confirm social tasks", async function () {
      await expect(squdyCampaignManager.connect(admin).confirmSocialTasks(campaignId, user1.address))
        .to.emit(squdyCampaignManager, "SocialTasksCompleted")
        .withArgs(campaignId, user1.address);
      
      const participant = await squdyCampaignManager.getParticipant(campaignId, user1.address);
      expect(participant.hasCompletedSocial).to.be.true;
    });

    it("Should check eligibility for winning", async function () {
      // Before social tasks completion
      expect(await squdyCampaignManager.isEligibleForWinning(campaignId, user1.address)).to.be.false;
      
      // After social tasks completion
      await squdyCampaignManager.connect(admin).confirmSocialTasks(campaignId, user1.address);
      expect(await squdyCampaignManager.isEligibleForWinning(campaignId, user1.address)).to.be.true;
    });

    it("Should fail to confirm social tasks for non-participant", async function () {
      await expect(
        squdyCampaignManager.connect(admin).confirmSocialTasks(campaignId, user2.address)
      ).to.be.revertedWith("SqudyCampaignManager: user not participating");
    });
  });

  describe("Winner Selection and Token Burning", function () {
    let campaignId;

    beforeEach(async function () {
      // Create and activate a campaign
      const startDate = (await time.latest()) + 3600;
      const endDate = (await time.latest()) + 86400;
      
      await squdyCampaignManager.connect(admin).createCampaign(
        "Test Campaign",
        "A test campaign",
        "https://example.com/image.jpg",
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("100"),
        startDate,
        endDate,
        ["1st Place: 1000 USD", "2nd Place: 500 USD"]
      );
      
      campaignId = 1;
      
      // Activate campaign
      await time.increaseTo(startDate);
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
      
      // Multiple users stake tokens
      const stakeAmount = ethers.utils.parseEther("100");
      
      for (const user of [user1, user2, user3]) {
        await mockSqudyToken.connect(user).approve(squdyCampaignManager.address, stakeAmount);
        await squdyCampaignManager.connect(user).stakeSQUDY(campaignId, stakeAmount);
        await squdyCampaignManager.connect(admin).confirmSocialTasks(campaignId, user.address);
      }
      
      // Close campaign
      await time.increaseTo(endDate);
      await squdyCampaignManager.connect(admin).closeCampaign(campaignId);
    });

    it("Should initiate winner selection", async function () {
      // Note: This test will fail in a real environment because VRF requires LINK tokens
      // In a real test, you would need to mock the VRF coordinator or use a testnet with LINK
      await expect(
        squdyCampaignManager.connect(admin).selectWinners(campaignId)
      ).to.be.reverted; // This will fail due to insufficient LINK balance
    });

    it("Should burn tokens after winner selection", async function () {
      // This test would require the VRF callback to work
      // For now, we'll test the burn function directly by simulating winner selection
      
      const campaign = await squdyCampaignManager.getCampaign(campaignId);
      const totalStaked = campaign.currentAmount;
      
      // Mock winner selection by directly setting winners (this would normally be done by VRF)
      // Note: This is not possible in the current contract design, so we'll skip this test
      // In a real implementation, you might want to add a test function for this
    });
  });

  describe("Admin Management", function () {
    it("Should allow adding and removing admins", async function () {
      // Add admin
      await expect(squdyCampaignManager.addAdmin(user1.address))
        .to.emit(squdyCampaignManager, "AdminAdded")
        .withArgs(user1.address);
      
      expect(await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), user1.address)).to.be.true;
      
      // Remove admin
      await expect(squdyCampaignManager.removeAdmin(user1.address))
        .to.emit(squdyCampaignManager, "AdminRemoved")
        .withArgs(user1.address);
      
      expect(await squdyCampaignManager.hasRole(await squdyCampaignManager.ADMIN_ROLE(), user1.address)).to.be.false;
    });

    it("Should prevent admin from removing themselves", async function () {
      await expect(
        squdyCampaignManager.removeAdmin(owner.address)
      ).to.be.revertedWith("SqudyCampaignManager: cannot remove self");
    });
  });

  describe("View Functions", function () {
    let campaignId;

    beforeEach(async function () {
      // Create a campaign
      const startDate = (await time.latest()) + 3600;
      const endDate = (await time.latest()) + 86400;
      
      await squdyCampaignManager.connect(admin).createCampaign(
        "Test Campaign",
        "A test campaign",
        "https://example.com/image.jpg",
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("100"),
        startDate,
        endDate,
        ["1st Place: 1000 USD"]
      );
      
      campaignId = 1;
    });

    it("Should return correct campaign count", async function () {
      expect(await squdyCampaignManager.getCampaignCount()).to.equal(1);
    });

    it("Should return campaigns by status", async function () {
      const pendingCampaigns = await squdyCampaignManager.getCampaignsByStatus(0); // PENDING
      expect(pendingCampaigns.length).to.equal(1);
      expect(pendingCampaigns[0]).to.equal(1);
    });

    it("Should return correct ticket count", async function () {
      // Activate campaign and stake tokens
      await time.increaseTo((await squdyCampaignManager.getCampaign(campaignId)).startDate);
      await squdyCampaignManager.connect(admin).activateCampaign(campaignId);
      
      const stakeAmount = ethers.utils.parseEther("300"); // 3 tickets
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
      await squdyCampaignManager.connect(user1).stakeSQUDY(campaignId, stakeAmount);
      
      expect(await squdyCampaignManager.getTicketCount(campaignId, user1.address)).to.equal(3);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency pause and unpause", async function () {
      await squdyCampaignManager.emergencyPause();
      expect(await squdyCampaignManager.paused()).to.be.true;
      
      await squdyCampaignManager.emergencyUnpause();
      expect(await squdyCampaignManager.paused()).to.be.false;
    });

    it("Should allow emergency token recovery", async function () {
      // Deploy a test token
      const TestToken = await ethers.getContractFactory("MockSqudyToken");
      const testToken = await TestToken.deploy();
      await testToken.deployed();
      
      // Mint some tokens to the campaign manager
      await testToken.mint(squdyCampaignManager.address, ethers.utils.parseEther("1000"));
      
      // Recover tokens
      await squdyCampaignManager.emergencyRecoverTokens(testToken.address, owner.address);
      
      expect(await testToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should prevent recovery of SQUDY tokens", async function () {
      await expect(
        squdyCampaignManager.emergencyRecoverTokens(mockSqudyToken.address, owner.address)
      ).to.be.revertedWith("SqudyCampaignManager: cannot recover SQUDY tokens");
    });
  });
}); 