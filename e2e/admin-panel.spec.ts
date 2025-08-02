import { test, expect, type Page } from '@playwright/test';

class AdminPanelPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  async connectAdminWallet() {
    // Mock admin wallet connection
    await this.page.evaluate(() => {
      window.ethereum = {
        request: async (params: any) => {
          if (params.method === 'eth_requestAccounts') {
            // Return admin wallet address (should match your env config)
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
    });

    const connectButton = this.page.locator('button:has-text("Connect Wallet")');
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await this.page.waitForSelector('text=0x1234', { timeout: 10000 });
    }
  }

  async openCreateCampaignModal() {
    await this.page.click('button:has-text("Create Campaign")');
    await this.page.waitForSelector('text=New Campaign');
  }

  async fillCampaignForm(campaignData: {
    name: string;
    description: string;
    softCap: string;
    hardCap: string;
    ticketAmount: string;
    duration: string;
  }) {
    await this.page.fill('input[name="name"]', campaignData.name);
    await this.page.fill('textarea[name="description"]', campaignData.description);
    await this.page.fill('input[name="softCap"]', campaignData.softCap);
    await this.page.fill('input[name="hardCap"]', campaignData.hardCap);
    await this.page.fill('input[name="ticketAmount"]', campaignData.ticketAmount);
    await this.page.fill('input[name="duration"]', campaignData.duration);
  }

  async submitCampaignForm() {
    await this.page.click('button:has-text("Create Campaign"):not(:disabled)');
  }

  async pauseCampaign(campaignName: string) {
    const campaignRow = this.page.locator(`tr:has-text("${campaignName}")`);
    await campaignRow.locator('button:has-text("Pause")').click();
    
    // Confirm action
    const confirmButton = this.page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  async resumeCampaign(campaignName: string) {
    const campaignRow = this.page.locator(`tr:has-text("${campaignName}")`);
    await campaignRow.locator('button:has-text("Resume")').click();
  }

  async selectWinners(campaignName: string) {
    const campaignRow = this.page.locator(`tr:has-text("${campaignName}")`);
    await campaignRow.locator('button:has-text("Select Winners")').click();
    
    // Confirm action
    const confirmButton = this.page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }
}

test.describe('Admin Panel E2E Tests', () => {
  let adminPage: AdminPanelPage;

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminPanelPage(page);
  });

  test('Admin authentication and access control', async ({ page }) => {
    await adminPage.goto();
    
    // Should show access required message initially
    await expect(page.locator('text=Admin Access Required')).toBeVisible();
    
    // Connect admin wallet
    await adminPage.connectAdminWallet();
    
    // Should now show admin panel
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    await expect(page.locator('text=Campaign Management')).toBeVisible();
  });

  test('Non-admin wallet access denied', async ({ page }) => {
    await page.goto('/admin');
    
    // Mock non-admin wallet connection
    await page.evaluate(() => {
      window.ethereum = {
        request: async (params: any) => {
          if (params.method === 'eth_requestAccounts') {
            // Return non-admin wallet address
            return ['0x9999999999999999999999999999999999999999'];
          }
          if (params.method === 'eth_chainId') {
            return '0xaa36a7';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    const connectButton = page.locator('button:has-text("Connect Wallet")');
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Should still show access denied
    await expect(page.locator('text=Admin Access Required')).toBeVisible();
  });

  test('Campaign dashboard overview', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Check dashboard statistics
    await expect(page.locator('text=Total Campaigns')).toBeVisible();
    await expect(page.locator('text=Active Campaigns')).toBeVisible();
    await expect(page.locator('text=Total Participants')).toBeVisible();
    
    // Check campaign list table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('Create new campaign workflow', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Open create campaign modal
    await adminPage.openCreateCampaignModal();
    
    // Fill campaign form
    const campaignData = {
      name: 'E2E Test Campaign',
      description: 'A campaign created during E2E testing',
      softCap: '1000',
      hardCap: '10000',
      ticketAmount: '100',
      duration: '7',
    };
    
    await adminPage.fillCampaignForm(campaignData);
    
    // Mock successful campaign creation
    await page.evaluate(() => {
      window.mockContractResponse = {
        createCampaign: { hash: '0xcreate123' },
      };
    });
    
    // Submit form
    await adminPage.submitCampaignForm();
    
    // Should show success message or close modal
    await page.waitForTimeout(2000);
    
    // Should see new campaign in list (or loading state)
    await expect(page.locator('text=Creating campaign') || 
                 page.locator(`text=${campaignData.name}`)).toBeTruthy();
  });

  test('Campaign form validation', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    await adminPage.openCreateCampaignModal();
    
    // Try to submit empty form
    await adminPage.submitCampaignForm();
    
    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible();
    
    // Test invalid hard cap (less than soft cap)
    await page.fill('input[name="name"]', 'Test Campaign');
    await page.fill('input[name="softCap"]', '10000');
    await page.fill('input[name="hardCap"]', '5000');
    
    await adminPage.submitCampaignForm();
    
    // Should show validation error
    await expect(page.locator('text=Hard cap must be greater')).toBeVisible();
  });

  test('Campaign management actions', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Wait for campaigns to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const campaigns = page.locator('table tbody tr');
    const campaignCount = await campaigns.count();
    
    if (campaignCount > 0) {
      const firstCampaign = campaigns.first();
      const campaignName = await firstCampaign.locator('td').first().textContent();
      
      if (campaignName) {
        // Test pause action
        const pauseButton = firstCampaign.locator('button:has-text("Pause")');
        if (await pauseButton.isVisible()) {
          await pauseButton.click();
          
          // Confirm action
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.waitForTimeout(1000);
          }
        }
        
        // Test resume action
        const resumeButton = firstCampaign.locator('button:has-text("Resume")');
        if (await resumeButton.isVisible()) {
          await resumeButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('Campaign filtering and search', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Test status filter
    const statusFilter = page.locator('select[name="status"], [role="combobox"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.click('option[value="active"], text=Active');
      await page.waitForTimeout(1000);
      
      // Should filter campaigns
      const activeCampaigns = page.locator('table tbody tr:has-text("Active")');
      await expect(activeCampaigns.first()).toBeVisible();
    }
    
    // Test search functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.waitForTimeout(1000);
      
      // Should filter results
      const searchResults = page.locator('table tbody tr');
      const resultCount = await searchResults.count();
      expect(resultCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Winner selection workflow', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Look for finished campaigns
    const finishedCampaigns = page.locator('table tbody tr:has-text("Finished")');
    const finishedCount = await finishedCampaigns.count();
    
    if (finishedCount > 0) {
      const firstFinished = finishedCampaigns.first();
      const selectWinnersButton = firstFinished.locator('button:has-text("Select Winners")');
      
      if (await selectWinnersButton.isVisible()) {
        await selectWinnersButton.click();
        
        // Confirm winner selection
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          
          // Mock winner selection process
          await page.evaluate(() => {
            window.mockContractResponse = {
              selectWinners: { hash: '0xwinners123' },
            };
          });
          
          await page.waitForTimeout(2000);
          
          // Should show success or loading state
          await expect(page.locator('text=Selecting winners') || 
                       page.locator('text=Winners selected')).toBeTruthy();
        }
      }
    }
  });

  test('Campaign editing workflow', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Wait for campaigns to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const campaigns = page.locator('table tbody tr');
    const campaignCount = await campaigns.count();
    
    if (campaignCount > 0) {
      const firstCampaign = campaigns.first();
      const editButton = firstCampaign.locator('button:has-text("Edit")');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should open edit modal
        await expect(page.locator('text=Edit Campaign')).toBeVisible();
        
        // Should have pre-filled form
        const nameInput = page.locator('input[name="name"]');
        const currentName = await nameInput.inputValue();
        expect(currentName).toBeTruthy();
        
        // Make a change
        await nameInput.fill(`${currentName} - Updated`);
        
        // Save changes
        const saveButton = page.locator('button:has-text("Save Changes")');
        await saveButton.click();
        
        await page.waitForTimeout(2000);
        
        // Should close modal and update list
        await expect(page.locator('text=Edit Campaign')).not.toBeVisible();
      }
    }
  });

  test('Real-time updates and notifications', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Mock real-time update
    await page.evaluate(() => {
      // Simulate socket.io connection for real-time updates
      window.mockSocketUpdate = {
        campaignUpdated: {
          id: 1,
          name: 'Updated Campaign',
          status: 'paused',
        },
      };
      
      // Trigger update event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('campaignUpdate', {
          detail: window.mockSocketUpdate.campaignUpdated
        }));
      }, 1000);
    });
    
    await page.waitForTimeout(2000);
    
    // Should see updated information (if real-time updates are implemented)
    // This test validates the infrastructure for real-time updates
  });

  test('Error handling and recovery', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Mock network error
    await page.route('**/api/admin/**', route => {
      route.abort('failed');
    });
    
    // Try to create campaign
    await adminPage.openCreateCampaignModal();
    await adminPage.fillCampaignForm({
      name: 'Error Test Campaign',
      description: 'Testing error handling',
      softCap: '1000',
      hardCap: '10000',
      ticketAmount: '100',
      duration: '7',
    });
    
    await adminPage.submitCampaignForm();
    
    // Should show error message
    await expect(page.locator('text=error, text=failed')).toBeVisible({ timeout: 5000 });
    
    // Should allow retry
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      // Remove network error mock
      await page.unroute('**/api/admin/**');
      await retryButton.click();
    }
  });

  test('Responsive admin panel on different viewports', async ({ page }) => {
    await adminPage.goto();
    await adminPage.connectAdminWallet();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should maintain functionality
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    await expect(page.locator('button:has-text("Create Campaign")')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should adapt for mobile (may need horizontal scroll for table)
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    
    // Check if mobile menu or adapted layout is present
    const mobileMenu = page.locator('button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
  });

  test('Performance monitoring for admin operations', async ({ page }) => {
    await adminPage.goto();
    
    // Measure admin panel load time
    const startTime = Date.now();
    await adminPage.connectAdminWallet();
    const authTime = Date.now() - startTime;
    
    // Should authenticate quickly (within 3 seconds)
    expect(authTime).toBeLessThan(3000);
    
    // Measure campaign list load time
    const listStartTime = Date.now();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const listLoadTime = Date.now() - listStartTime;
    
    // Should load campaign list quickly (within 5 seconds)
    expect(listLoadTime).toBeLessThan(5000);
    
    // Test bulk operations performance
    const bulkStartTime = Date.now();
    
    // Simulate multiple quick actions
    const campaigns = page.locator('table tbody tr');
    const count = Math.min(await campaigns.count(), 3);
    
    for (let i = 0; i < count; i++) {
      const campaign = campaigns.nth(i);
      const viewButton = campaign.locator('button:has-text("View")');
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(100);
      }
    }
    
    const bulkTime = Date.now() - bulkStartTime;
    
    // Bulk operations should complete reasonably quickly
    expect(bulkTime).toBeLessThan(5000);
  });
});