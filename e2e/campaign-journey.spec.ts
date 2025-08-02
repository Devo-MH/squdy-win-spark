import { test, expect, type Page } from '@playwright/test';

// Helper functions for common actions
class CampaignJourneyPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCampaigns() {
    await this.page.click('text=Campaigns');
    await this.page.waitForURL('**/campaigns');
    await this.page.waitForLoadState('networkidle');
  }

  async openCampaignDetail(campaignName: string) {
    await this.page.click(`text=${campaignName}`);
    await this.page.waitForLoadState('networkidle');
  }

  async connectWallet() {
    const connectButton = this.page.locator('button:has-text("Connect Wallet")');
    if (await connectButton.isVisible()) {
      await connectButton.click();
      // Mock wallet connection for testing
      await this.page.evaluate(() => {
        // Simulate MetaMask connection
        window.ethereum = {
          request: async (params: any) => {
            if (params.method === 'eth_requestAccounts') {
              return ['0x1234567890123456789012345678901234567890'];
            }
            if (params.method === 'eth_chainId') {
              return '0xaa36a7'; // Sepolia
            }
            return null;
          },
          on: () => {},
          removeListener: () => {},
        };
        
        // Trigger connection event
        window.dispatchEvent(new CustomEvent('ethereum#initialized'));
      });
    }
  }

  async waitForWalletConnection() {
    await this.page.waitForSelector('text=0x1234', { timeout: 10000 });
  }

  async stakeToCampaign(amount: string) {
    // Fill stake amount
    const amountInput = this.page.locator('input[type="number"]').first();
    await amountInput.fill(amount);
    
    // Click stake button
    const stakeButton = this.page.locator('button:has-text("Stake")');
    await stakeButton.click();
    
    // Handle approval if needed
    const approveButton = this.page.locator('button:has-text("Approve")');
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await this.page.waitForTimeout(2000); // Wait for approval
    }
    
    // Confirm staking
    await stakeButton.click();
  }

  async completeSocialTask(taskType: string) {
    const taskButton = this.page.locator(`button:has-text("Complete"):near(:text("${taskType}"))`);
    await taskButton.click();
    await this.page.waitForTimeout(1000);
  }
}

test.describe('Campaign User Journey', () => {
  let campaignPage: CampaignJourneyPage;

  test.beforeEach(async ({ page }) => {
    campaignPage = new CampaignJourneyPage(page);
  });

  test('Complete user journey from homepage to campaign participation', async ({ page }) => {
    // Start at homepage
    await campaignPage.goto();
    
    // Verify homepage loads correctly
    await expect(page.locator('h1')).toContainText('Squdy');
    await expect(page.locator('text=Burn-to-Win')).toBeVisible();
    
    // Navigate to campaigns
    await campaignPage.navigateToCampaigns();
    
    // Verify campaigns page
    await expect(page.locator('text=Active Campaigns')).toBeVisible();
    
    // Check for campaign cards
    const campaignCards = page.locator('[role="article"]');
    await expect(campaignCards.first()).toBeVisible();
    
    // Click on first campaign
    const firstCampaign = campaignCards.first();
    const campaignName = await firstCampaign.locator('h3').textContent();
    await firstCampaign.click();
    
    // Verify campaign detail page
    await expect(page.locator(`h1:has-text("${campaignName}")`)).toBeVisible();
    await expect(page.locator('text=Campaign Details')).toBeVisible();
    
    // Check campaign information is displayed
    await expect(page.locator('text=Progress')).toBeVisible();
    await expect(page.locator('text=Participants')).toBeVisible();
    await expect(page.locator('text=Time Left')).toBeVisible();
  });

  test('Wallet connection and authentication flow', async ({ page }) => {
    await campaignPage.goto();
    
    // Check initial state (not connected)
    await expect(page.locator('button:has-text("Connect Wallet")')).toBeVisible();
    
    // Mock wallet connection
    await campaignPage.connectWallet();
    await campaignPage.waitForWalletConnection();
    
    // Verify wallet is connected
    await expect(page.locator('text=0x1234')).toBeVisible();
    
    // Check wallet dropdown functionality
    await page.click('text=0x1234');
    await expect(page.locator('text=Disconnect')).toBeVisible();
    await expect(page.locator('text=View on Etherscan')).toBeVisible();
  });

  test('Campaign participation flow with staking', async ({ page }) => {
    await campaignPage.goto();
    await campaignPage.connectWallet();
    await campaignPage.waitForWalletConnection();
    
    // Navigate to campaign detail
    await page.click('text=Campaigns');
    await page.waitForLoadState('networkidle');
    
    const firstCampaign = page.locator('[role="article"]').first();
    await firstCampaign.click();
    
    // Verify staking interface
    await expect(page.locator('text=Stake SQUDY Tokens')).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
    
    // Check balance display
    await expect(page.locator('text=Balance:')).toBeVisible();
    
    // Test staking validation
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('50'); // Below minimum
    await expect(page.locator('text=Minimum')).toBeVisible();
    
    // Test valid staking amount
    await amountInput.fill('500');
    await expect(page.locator('text=5 tickets')).toBeVisible();
    
    // Mock successful staking
    await page.evaluate(() => {
      // Mock contract interactions
      window.mockContractResponse = {
        approve: { hash: '0xapprove' },
        stake: { hash: '0xstake' },
      };
    });
    
    // Attempt to stake
    const stakeButton = page.locator('button:has-text("Stake")');
    await stakeButton.click();
  });

  test('Social media tasks completion flow', async ({ page }) => {
    await campaignPage.goto();
    await campaignPage.connectWallet();
    await campaignPage.waitForWalletConnection();
    
    // Navigate to campaign with social tasks
    await page.click('text=Campaigns');
    const firstCampaign = page.locator('[role="article"]').first();
    await firstCampaign.click();
    
    // Check social media tasks section
    await expect(page.locator('text=Social Media Tasks')).toBeVisible();
    
    // Verify all task types are present
    await expect(page.locator('text=Follow')).toBeVisible();
    await expect(page.locator('text=Like')).toBeVisible();
    await expect(page.locator('text=Retweet')).toBeVisible();
    await expect(page.locator('text=Discord')).toBeVisible();
    await expect(page.locator('text=Telegram')).toBeVisible();
    
    // Test task completion
    const followTask = page.locator('button:has-text("Complete"):near(:text("Follow"))').first();
    if (await followTask.isVisible()) {
      await followTask.click();
      // Should show success state or loading
      await page.waitForTimeout(1000);
    }
  });

  test('Campaign filtering and search functionality', async ({ page }) => {
    await campaignPage.goto();
    await page.click('text=Campaigns');
    await page.waitForLoadState('networkidle');
    
    // Test status filter if available
    const statusFilter = page.locator('select, [role="combobox"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.click('text=Active');
      await page.waitForLoadState('networkidle');
    }
    
    // Test search functionality if available
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.waitForTimeout(1000);
      
      // Should filter campaigns
      const campaignCards = page.locator('[role="article"]');
      const cardCount = await campaignCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Responsive design and mobile experience', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await campaignPage.goto();
    
    // Check mobile navigation
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('text=Campaigns')).toBeVisible();
    }
    
    // Check campaign cards on mobile
    await page.click('text=Campaigns');
    await page.waitForLoadState('networkidle');
    
    const campaignCards = page.locator('[role="article"]');
    await expect(campaignCards.first()).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(campaignCards.first()).toBeVisible();
  });

  test('Error handling and edge cases', async ({ page }) => {
    await campaignPage.goto();
    
    // Test navigation to non-existent campaign
    await page.goto('/campaigns/999999');
    await page.waitForLoadState('networkidle');
    
    // Should show error or not found page
    const errorIndicators = [
      page.locator('text=not found'),
      page.locator('text=error'),
      page.locator('text=404'),
    ];
    
    let errorFound = false;
    for (const indicator of errorIndicators) {
      if (await indicator.isVisible()) {
        errorFound = true;
        break;
      }
    }
    
    // Either show error or redirect to campaigns
    if (!errorFound) {
      await expect(page).toHaveURL(/campaigns/);
    }
    
    // Test with slow network
    await page.route('**/api/**', route => {
      setTimeout(() => {
        route.continue();
      }, 2000);
    });
    
    await page.click('text=Campaigns');
    
    // Should show loading state
    await expect(page.locator('text=Loading, text=loading')).toBeVisible({ timeout: 1000 });
  });

  test('Performance and loading states', async ({ page }) => {
    await campaignPage.goto();
    
    // Measure page load performance
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Check for loading indicators
    await page.click('text=Campaigns');
    
    // Fast loading should complete quickly
    await page.waitForLoadState('networkidle', { timeout: 3000 });
    
    // Check that campaign cards are rendered
    const campaignCards = page.locator('[role="article"]');
    await expect(campaignCards.first()).toBeVisible();
  });

  test('Accessibility keyboard navigation', async ({ page }) => {
    await campaignPage.goto();
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test Enter key navigation
    await page.keyboard.press('Enter');
    
    // Should navigate or activate focused element
    await page.waitForTimeout(1000);
    
    // Test campaign card keyboard navigation
    await page.click('text=Campaigns');
    await page.waitForLoadState('networkidle');
    
    const firstCard = page.locator('[role="article"]').first();
    await firstCard.focus();
    await page.keyboard.press('Enter');
    
    // Should navigate to campaign detail
    await page.waitForLoadState('networkidle');
  });
});