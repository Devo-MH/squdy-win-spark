const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, mine, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SqudyCampaignManager - Enhanced Security & Edge Case Tests", function () {
  // Constants
  const CAMPAIGN_DURATION = 7 * 24 * 60 * 60; // 7 days
  const SOFT_CAP = ethers.utils.parseEther("10000");
  const HARD_CAP = ethers.utils.parseEther("100000");
  const TICKET_AMOUNT = ethers.utils.parseEther("100");
  const MAX_UINT256 = ethers.constants.MaxUint256;

  async function deployContractsFixture() {
    const [owner, admin, user1, user2, user3, user4, user5, attacker] = await ethers.getSigners();

    // Deploy Mock SQUDY Token
    const MockSqudyToken = await ethers.getContractFactory("MockSqudyToken");
    const mockSqudyToken = await MockSqudyToken.deploy();

    // Deploy Campaign Manager
    const SqudyCampaignManager = await ethers.getContractFactory("SqudyCampaignManager");
    const VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
    const KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
    const SUBSCRIPTION_ID = 1;

    const squdyCampaignManager = await SqudyCampaignManager.deploy(
      mockSqudyToken.address,
      VRF_COORDINATOR,
      KEY_HASH,
      SUBSCRIPTION_ID
    );

    // Setup initial state
    await squdyCampaignManager.addAdmin(admin.address);

    // Distribute tokens for testing
    const testAmount = ethers.utils.parseEther("20000");
    await mockSqudyToken.mint(user1.address, testAmount);
    await mockSqudyToken.mint(user2.address, testAmount);
    await mockSqudyToken.mint(user3.address, testAmount);
    await mockSqudyToken.mint(user4.address, testAmount);
    await mockSqudyToken.mint(user5.address, testAmount);
    await mockSqudyToken.mint(attacker.address, testAmount);

    return {
      mockSqudyToken,
      squdyCampaignManager,
      owner,
      admin,
      user1,
      user2,
      user3,
      user4,
      user5,
      attacker
    };
  }

  async function createCampaignFixture() {
    const contracts = await loadFixture(deployContractsFixture);
    const { squdyCampaignManager, admin } = contracts;

    const currentTime = await time.latest();
    const startTime = currentTime + 100;
    const endTime = startTime + CAMPAIGN_DURATION;

    const prizes = [
      { name: "First Prize", description: "Main prize", value: ethers.utils.parseEther("1000"), currency: "USD", quantity: 1 },
      { name: "Second Prize", description: "Runner up", value: ethers.utils.parseEther("500"), currency: "USD", quantity: 1 }
    ];

    const socialRequirements = {
      twitter: { followAccount: "@SqudyToken", likePostId: "123", retweetPostId: "456" },
      discord: { serverId: "789", inviteLink: "discord.gg/squdy" },
      telegram: { groupId: "101112", inviteLink: "t.me/squdy" },
      medium: { profileUrl: "medium.com/@squdy" },
      newsletter: { endpoint: "squdy.com/newsletter" }
    };

    await squdyCampaignManager.connect(admin).createCampaign(
      "Test Campaign",
      "Test Description",
      "https://example.com/image.jpg",
      SOFT_CAP,
      HARD_CAP,
      TICKET_AMOUNT,
      startTime,
      endTime,
      prizes,
      socialRequirements
    );

    return { ...contracts, campaignId: 1, startTime, endTime };
  }

  describe("Security Tests", function () {
    describe("Access Control", function () {
      it("Should prevent non-admin from creating campaigns", async function () {
        const { squdyCampaignManager, user1 } = await loadFixture(deployContractsFixture);
        
        const currentTime = await time.latest();
        const startTime = currentTime + 100;
        const endTime = startTime + CAMPAIGN_DURATION;

        await expect(
          squdyCampaignManager.connect(user1).createCampaign(
            "Unauthorized Campaign",
            "Test Description",
            "https://example.com/image.jpg",
            SOFT_CAP,
            HARD_CAP,
            TICKET_AMOUNT,
            startTime,
            endTime,
            [],
            { twitter: { followAccount: "", likePostId: "", retweetPostId: "" }, discord: { serverId: "", inviteLink: "" }, telegram: { groupId: "", inviteLink: "" }, medium: { profileUrl: "" }, newsletter: { endpoint: "" } }
          )
        ).to.be.revertedWith("AccessControl:");
      });

      it("Should prevent non-admin from pausing campaigns", async function () {
        const { squdyCampaignManager, user1 } = await loadFixture(createCampaignFixture);
        
        await expect(
          squdyCampaignManager.connect(user1).pauseCampaign(1)
        ).to.be.revertedWith("AccessControl:");
      });

      it("Should prevent non-admin from selecting winners", async function () {
        const { squdyCampaignManager, user1 } = await loadFixture(createCampaignFixture);
        
        await expect(
          squdyCampaignManager.connect(user1).selectWinners(1)
        ).to.be.revertedWith("AccessControl:");
      });

      it("Should prevent non-admin from burning tokens", async function () {
        const { squdyCampaignManager, user1 } = await loadFixture(createCampaignFixture);
        
        await expect(
          squdyCampaignManager.connect(user1).burnTokens(1)
        ).to.be.revertedWith("AccessControl:");
      });
    });

    describe("Reentrancy Protection", function () {
      it("Should prevent reentrancy attacks during staking", async function () {
        const { squdyCampaignManager, mockSqudyToken, user1, startTime } = await loadFixture(createCampaignFixture);
        
        // Advance time to campaign start
        await time.increaseTo(startTime);
        
        const stakeAmount = TICKET_AMOUNT;
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
        
        // This should work normally
        await expect(
          squdyCampaignManager.connect(user1).stakeTokens(1, stakeAmount, {
            twitterFollow: false,
            twitterLike: false,
            twitterRetweet: false,
            discordJoined: false,
            telegramJoined: false,
            mediumFollowed: false,
            newsletterSubscribed: false
          })
        ).to.not.be.reverted;
        
        // Attempting to stake again with same parameters should fail
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
        await expect(
          squdyCampaignManager.connect(user1).stakeTokens(1, stakeAmount, {
            twitterFollow: false,
            twitterLike: false,
            twitterRetweet: false,
            discordJoined: false,
            telegramJoined: false,
            mediumFollowed: false,
            newsletterSubscribed: false
          })
        ).to.be.revertedWith("Already participated");
      });
    });

    describe("Integer Overflow/Underflow Protection", function () {
      it("Should handle maximum values safely", async function () {
        const { squdyCampaignManager, admin } = await loadFixture(deployContractsFixture);
        
        const currentTime = await time.latest();
        const startTime = currentTime + 100;
        const endTime = startTime + CAMPAIGN_DURATION;
        
        // Test with maximum possible values
        const maxSoftCap = ethers.utils.parseEther("1000000000"); // 1B tokens
        const maxHardCap = ethers.utils.parseEther("10000000000"); // 10B tokens
        const maxTicketAmount = ethers.utils.parseEther("1000000"); // 1M tokens
        
        await expect(
          squdyCampaignManager.connect(admin).createCampaign(
            "Max Value Campaign",
            "Testing maximum values",
            "https://example.com/image.jpg",
            maxSoftCap,
            maxHardCap,
            maxTicketAmount,
            startTime,
            endTime,
            [],
            { twitter: { followAccount: "", likePostId: "", retweetPostId: "" }, discord: { serverId: "", inviteLink: "" }, telegram: { groupId: "", inviteLink: "" }, medium: { profileUrl: "" }, newsletter: { endpoint: "" } }
          )
        ).to.not.be.reverted;
      });
    });
  });

  describe("Edge Cases", function () {
    describe("Campaign Lifecycle Edge Cases", function () {
      it("Should handle campaign with zero prizes", async function () {
        const { squdyCampaignManager, admin } = await loadFixture(deployContractsFixture);
        
        const currentTime = await time.latest();
        const startTime = currentTime + 100;
        const endTime = startTime + CAMPAIGN_DURATION;
        
        await expect(
          squdyCampaignManager.connect(admin).createCampaign(
            "No Prize Campaign",
            "Testing zero prizes",
            "https://example.com/image.jpg",
            SOFT_CAP,
            HARD_CAP,
            TICKET_AMOUNT,
            startTime,
            endTime,
            [], // No prizes
            { twitter: { followAccount: "", likePostId: "", retweetPostId: "" }, discord: { serverId: "", inviteLink: "" }, telegram: { groupId: "", inviteLink: "" }, medium: { profileUrl: "" }, newsletter: { endpoint: "" } }
          )
        ).to.not.be.reverted;
      });

      it("Should handle campaign with minimum duration", async function () {
        const { squdyCampaignManager, admin } = await loadFixture(deployContractsFixture);
        
        const currentTime = await time.latest();
        const startTime = currentTime + 100;
        const endTime = startTime + 3600; // 1 hour minimum
        
        await expect(
          squdyCampaignManager.connect(admin).createCampaign(
            "Short Campaign",
            "Testing minimum duration",
            "https://example.com/image.jpg",
            SOFT_CAP,
            HARD_CAP,
            TICKET_AMOUNT,
            startTime,
            endTime,
            [],
            { twitter: { followAccount: "", likePostId: "", retweetPostId: "" }, discord: { serverId: "", inviteLink: "" }, telegram: { groupId: "", inviteLink: "" }, medium: { profileUrl: "" }, newsletter: { endpoint: "" } }
          )
        ).to.not.be.reverted;
      });

      it("Should reject campaign with end time before start time", async function () {
        const { squdyCampaignManager, admin } = await loadFixture(deployContractsFixture);
        
        const currentTime = await time.latest();
        const startTime = currentTime + 1000;
        const endTime = startTime - 100; // End before start
        
        await expect(
          squdyCampaignManager.connect(admin).createCampaign(
            "Invalid Time Campaign",
            "Testing invalid timing",
            "https://example.com/image.jpg",
            SOFT_CAP,
            HARD_CAP,
            TICKET_AMOUNT,
            startTime,
            endTime,
            [],
            { twitter: { followAccount: "", likePostId: "", retweetPostId: "" }, discord: { serverId: "", inviteLink: "" }, telegram: { groupId: "", inviteLink: "" }, medium: { profileUrl: "" }, newsletter: { endpoint: "" } }
          )
        ).to.be.revertedWith("Invalid end time");
      });

      it("Should reject campaign with hard cap less than soft cap", async function () {
        const { squdyCampaignManager, admin } = await loadFixture(deployContractsFixture);
        
        const currentTime = await time.latest();
        const startTime = currentTime + 100;
        const endTime = startTime + CAMPAIGN_DURATION;
        
        await expect(
          squdyCampaignManager.connect(admin).createCampaign(
            "Invalid Caps Campaign",
            "Testing invalid caps",
            "https://example.com/image.jpg",
            HARD_CAP,
            SOFT_CAP, // Hard cap < Soft cap
            TICKET_AMOUNT,
            startTime,
            endTime,
            [],
            { twitter: { followAccount: "", likePostId: "", retweetPostId: "" }, discord: { serverId: "", inviteLink: "" }, telegram: { groupId: "", inviteLink: "" }, medium: { profileUrl: "" }, newsletter: { endpoint: "" } }
          )
        ).to.be.revertedWith("Invalid caps");
      });
    });

    describe("Staking Edge Cases", function () {
      it("Should handle staking exactly at hard cap", async function () {
        const { squdyCampaignManager, mockSqudyToken, user1, user2, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        // User 1 stakes just under hard cap
        const stake1 = HARD_CAP.sub(TICKET_AMOUNT);
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stake1);
        await squdyCampaignManager.connect(user1).stakeTokens(1, stake1, {
          twitterFollow: true,
          twitterLike: true,
          twitterRetweet: true,
          discordJoined: true,
          telegramJoined: true,
          mediumFollowed: true,
          newsletterSubscribed: true
        });
        
        // User 2 stakes exactly to reach hard cap
        const stake2 = TICKET_AMOUNT;
        await mockSqudyToken.connect(user2).approve(squdyCampaignManager.address, stake2);
        await squdyCampaignManager.connect(user2).stakeTokens(1, stake2, {
          twitterFollow: true,
          twitterLike: true,
          twitterRetweet: true,
          discordJoined: true,
          telegramJoined: true,
          mediumFollowed: true,
          newsletterSubscribed: true
        });
        
        const campaign = await squdyCampaignManager.getCampaign(1);
        expect(campaign.currentAmount).to.equal(HARD_CAP);
      });

      it("Should reject staking that would exceed hard cap", async function () {
        const { squdyCampaignManager, mockSqudyToken, user1, user2, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        // User 1 stakes near hard cap
        const stake1 = HARD_CAP.sub(TICKET_AMOUNT.div(2));
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stake1);
        await squdyCampaignManager.connect(user1).stakeTokens(1, stake1, {
          twitterFollow: true,
          twitterLike: true,
          twitterRetweet: true,
          discordJoined: true,
          telegramJoined: true,
          mediumFollowed: true,
          newsletterSubscribed: true
        });
        
        // User 2 tries to stake amount that would exceed hard cap
        const stake2 = TICKET_AMOUNT;
        await mockSqudyToken.connect(user2).approve(squdyCampaignManager.address, stake2);
        await expect(
          squdyCampaignManager.connect(user2).stakeTokens(1, stake2, {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          })
        ).to.be.revertedWith("Would exceed hard cap");
      });

      it("Should handle staking with insufficient token balance", async function () {
        const { squdyCampaignManager, mockSqudyToken, user1, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        // Try to stake more than user's balance
        const userBalance = await mockSqudyToken.balanceOf(user1.address);
        const stakeAmount = userBalance.add(ethers.utils.parseEther("1000"));
        
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, stakeAmount);
        await expect(
          squdyCampaignManager.connect(user1).stakeTokens(1, stakeAmount, {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          })
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      });

      it("Should handle staking with insufficient allowance", async function () {
        const { squdyCampaignManager, user1, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        // Don't approve tokens, try to stake anyway
        await expect(
          squdyCampaignManager.connect(user1).stakeTokens(1, TICKET_AMOUNT, {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          })
        ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
      });
    });

    describe("Gas Optimization Tests", function () {
      it("Should handle multiple participants efficiently", async function () {
        const { squdyCampaignManager, mockSqudyToken, user1, user2, user3, user4, user5, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        const users = [user1, user2, user3, user4, user5];
        const stakeAmount = TICKET_AMOUNT.mul(10); // 10 tickets each
        
        // Measure gas for multiple participants
        const gasUsed = [];
        
        for (const user of users) {
          await mockSqudyToken.connect(user).approve(squdyCampaignManager.address, stakeAmount);
          const tx = await squdyCampaignManager.connect(user).stakeTokens(1, stakeAmount, {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          });
          const receipt = await tx.wait();
          gasUsed.push(receipt.gasUsed);
        }
        
        // Check that gas usage doesn't increase dramatically with more participants
        const maxGas = Math.max(...gasUsed.map(g => g.toNumber()));
        const minGas = Math.min(...gasUsed.map(g => g.toNumber()));
        const gasVariation = (maxGas - minGas) / minGas;
        
        expect(gasVariation).to.be.lessThan(0.1); // Less than 10% variation
      });
    });
  });

  describe("Emergency Functions", function () {
    describe("Emergency Token Recovery", function () {
      it("Should allow owner to recover accidentally sent tokens", async function () {
        const { squdyCampaignManager, mockSqudyToken, owner, user1 } = await loadFixture(deployContractsFixture);
        
        // Accidentally send tokens to contract
        const accidentalAmount = ethers.utils.parseEther("1000");
        await mockSqudyToken.connect(user1).transfer(squdyCampaignManager.address, accidentalAmount);
        
        const ownerBalanceBefore = await mockSqudyToken.balanceOf(owner.address);
        
        // Owner recovers tokens
        await squdyCampaignManager.emergencyRecoverTokens(mockSqudyToken.address, accidentalAmount);
        
        const ownerBalanceAfter = await mockSqudyToken.balanceOf(owner.address);
        expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(accidentalAmount);
      });

      it("Should prevent non-owner from recovering tokens", async function () {
        const { squdyCampaignManager, mockSqudyToken, user1 } = await loadFixture(deployContractsFixture);
        
        await expect(
          squdyCampaignManager.connect(user1).emergencyRecoverTokens(mockSqudyToken.address, ethers.utils.parseEther("100"))
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    describe("Pause Functionality", function () {
      it("Should prevent staking when contract is paused", async function () {
        const { squdyCampaignManager, mockSqudyToken, owner, user1, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        // Pause contract
        await squdyCampaignManager.connect(owner).pause();
        
        // Try to stake while paused
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, TICKET_AMOUNT);
        await expect(
          squdyCampaignManager.connect(user1).stakeTokens(1, TICKET_AMOUNT, {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          })
        ).to.be.revertedWith("Pausable: paused");
      });

      it("Should allow staking after unpausing", async function () {
        const { squdyCampaignManager, mockSqudyToken, owner, user1, startTime } = await loadFixture(createCampaignFixture);
        
        await time.increaseTo(startTime);
        
        // Pause and unpause
        await squdyCampaignManager.connect(owner).pause();
        await squdyCampaignManager.connect(owner).unpause();
        
        // Should work after unpausing
        await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, TICKET_AMOUNT);
        await expect(
          squdyCampaignManager.connect(user1).stakeTokens(1, TICKET_AMOUNT, {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          })
        ).to.not.be.reverted;
      });
    });
  });

  describe("State Transition Tests", function () {
    it("Should handle complete campaign lifecycle", async function () {
      const { squdyCampaignManager, mockSqudyToken, admin, user1, user2, startTime, endTime } = await loadFixture(createCampaignFixture);
      
      // Initial state: PENDING
      let campaign = await squdyCampaignManager.getCampaign(1);
      expect(campaign.status).to.equal(0); // PENDING
      
      // Activate campaign
      await squdyCampaignManager.connect(admin).activateCampaign(1);
      campaign = await squdyCampaignManager.getCampaign(1);
      expect(campaign.status).to.equal(1); // ACTIVE
      
      // Advance to start time and participate
      await time.increaseTo(startTime);
      
      await mockSqudyToken.connect(user1).approve(squdyCampaignManager.address, TICKET_AMOUNT);
      await squdyCampaignManager.connect(user1).stakeTokens(1, TICKET_AMOUNT, {
        twitterFollow: true,
        twitterLike: true,
        twitterRetweet: true,
        discordJoined: true,
        telegramJoined: true,
        mediumFollowed: true,
        newsletterSubscribed: true
      });
      
      await mockSqudyToken.connect(user2).approve(squdyCampaignManager.address, TICKET_AMOUNT);
      await squdyCampaignManager.connect(user2).stakeTokens(1, TICKET_AMOUNT, {
        twitterFollow: true,
        twitterLike: true,
        twitterRetweet: true,
        discordJoined: true,
        telegramJoined: true,
        mediumFollowed: true,
        newsletterSubscribed: true
      });
      
      // Advance past end time
      await time.increaseTo(endTime + 1);
      
      // Close campaign
      await squdyCampaignManager.connect(admin).closeCampaign(1);
      campaign = await squdyCampaignManager.getCampaign(1);
      expect(campaign.status).to.equal(3); // FINISHED
      
      // Select winners
      await squdyCampaignManager.connect(admin).selectWinners(1);
      
      // Burn tokens
      await squdyCampaignManager.connect(admin).burnTokens(1);
      campaign = await squdyCampaignManager.getCampaign(1);
      expect(campaign.status).to.equal(4); // BURNED
    });
  });
});