import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup for E2E tests...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Pre-warm the application
    console.log('Pre-warming application...');
    await page.goto('http://localhost:8080');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Check if the backend is running
    console.log('Checking backend connectivity...');
    try {
      const response = await page.request.get('http://localhost:3001/api/campaigns');
      console.log(`Backend health check: ${response.status()}`);
    } catch (error) {
      console.warn('Backend not available, tests will use mock data');
    }

    // Set up test data if needed
    console.log('Setting up test environment...');
    
    // You can add more setup steps here, such as:
    // - Creating test users
    // - Setting up test campaigns
    // - Clearing test databases
    
    console.log('Global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;