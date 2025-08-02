async function globalTeardown() {
  console.log('Starting global teardown for E2E tests...');

  try {
    // Clean up test data
    console.log('Cleaning up test data...');
    
    // You can add cleanup steps here, such as:
    // - Removing test users
    // - Cleaning test campaigns
    // - Resetting test databases
    // - Clearing localStorage/sessionStorage
    
    console.log('Global teardown completed successfully');
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw here as it would fail the entire test suite
  }
}

export default globalTeardown;