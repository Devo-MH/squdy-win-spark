# Testing Guide

This document provides comprehensive information about the testing setup and practices for the Squdy Burn-to-Win platform.

## 🧪 Testing Stack

### Frontend Testing
- **Vitest**: Fast unit test runner with hot module replacement
- **React Testing Library**: Component testing focused on user behavior
- **MSW (Mock Service Worker)**: API mocking for realistic testing
- **axe-core**: Accessibility testing
- **Playwright**: End-to-end testing across browsers

### Backend Testing
- **Jest**: Unit and integration testing for Node.js
- **Supertest**: HTTP assertion testing
- **MongoDB Memory Server**: In-memory database for testing

### Smart Contract Testing
- **Hardhat**: Ethereum development framework
- **Chai**: Assertion library for contract testing
- **Waffle**: Advanced contract testing utilities

## 📁 Test Structure

```
├── src/
│   ├── test/
│   │   ├── setup.ts                 # Global test setup
│   │   ├── setup-a11y.ts           # Accessibility test setup
│   │   ├── setup-integration.ts     # Integration test setup
│   │   ├── utils.tsx               # Test utilities and helpers
│   │   └── mocks/
│   │       ├── server.ts           # MSW server setup
│   │       ├── handlers.ts         # API mock handlers
│   │       └── data.ts             # Mock data factories
│   ├── components/
│   │   ├── Header.test.tsx         # Component unit tests
│   │   ├── Header.a11y.test.tsx    # Accessibility tests
│   │   └── ...
│   ├── pages/
│   │   ├── HomePage.integration.test.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useCampaigns.test.tsx
│   │   └── ...
│   └── services/
│       ├── api.test.ts
│       └── ...
├── e2e/
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   ├── campaign-journey.spec.ts
│   └── admin-panel.spec.ts
├── test/
│   └── SqudyCampaignManager.test.cjs
└── backend/
    └── src/tests/
        ├── setup.ts
        ├── campaigns.test.ts
        └── ...
```

## 🚀 Running Tests

### Quick Commands

```bash
# Run all UI tests
npm run test:ui

# Run tests in watch mode
npm run test:ui:watch

# Run tests with coverage
npm run test:ui:coverage

# Run accessibility tests
npm run test:a11y

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:playwright

# Run all frontend tests
npm run test:all:ui

# Run smart contract tests
npm run test

# Run backend tests
npm run test:backend

# Run all tests
npm run test:all
```

### Detailed Test Commands

```bash
# Unit tests with UI
npm run test:ui:dev

# E2E tests with browser UI
npm run test:playwright:ui

# E2E tests in debug mode
npm run test:playwright:debug

# View Playwright test report
npm run test:playwright:report

# Contract tests with gas reporting
npm run test:coverage
```

## 📝 Writing Tests

### Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const { user } = renderWithProviders(<MyComponent />);
    const button = screen.getByRole('button');
    
    await user.click(button);
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { mockUseCampaigns } from '@/test/mocks/data';
import MyPage from './MyPage';

describe('MyPage Integration', () => {
  it('loads and displays data correctly', async () => {
    mockUseCampaigns.mockReturnValue({
      data: { campaigns: mockCampaigns },
      isLoading: false,
    });

    renderWithProviders(<MyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Campaign 1')).toBeInTheDocument();
    });
  });
});
```

### Accessibility Tests

```typescript
import { describe, it, expect } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithProviders } from '@/test/utils';
import { a11yConfig } from '@/test/setup-a11y';
import MyComponent from './MyComponent';

describe('MyComponent Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = renderWithProviders(<MyComponent />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', async () => {
    const { container } = renderWithProviders(<MyComponent />);
    const results = await axe(container, a11yConfig.interactiveRules);
    
    expect(results).toHaveNoViolations();
  });
});
```

### End-to-End Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can complete campaign journey', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to campaigns
  await page.click('text=Campaigns');
  await expect(page).toHaveURL('/campaigns');
  
  // Click on a campaign
  await page.click('[role="article"]');
  
  // Verify campaign detail page
  await expect(page.locator('h1')).toBeVisible();
});
```

### Hook Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/utils';
import { useMyCampaigns } from './useCampaigns';

describe('useCampaigns', () => {
  it('fetches campaigns successfully', async () => {
    const { result } = renderHook(() => useCampaigns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

## 🛠 Test Utilities

### Custom Render Function

```typescript
import { renderWithProviders } from '@/test/utils';

// Renders component with all necessary providers
const { user, queryClient } = renderWithProviders(<Component />);

// With specific route
renderWithProviders(<Component />, { initialRoute: '/campaigns' });

// With mock query data
renderWithQueryState(<Component />, {
  '["campaigns"]': mockCampaigns,
});
```

### Mock Data Factories

```typescript
import { mockCampaign, createMockCampaign } from '@/test/mocks/data';

// Use predefined mock data
const campaign = mockCampaign(1);

// Create custom mock data
const customCampaign = createMockCampaign({
  name: 'Custom Campaign',
  status: 'active',
});
```

### API Mocking with MSW

```typescript
// Mock specific API response
server.use(
  http.get('/api/campaigns', () => {
    return HttpResponse.json({ campaigns: mockCampaigns });
  })
);

// Mock error response
server.use(
  http.get('/api/campaigns', () => {
    return HttpResponse.json({ error: 'Server error' }, { status: 500 });
  })
);
```

## 🔧 Configuration

### Vitest Configuration

Key settings in `vitest.config.ts`:
- **Environment**: jsdom for browser-like environment
- **Setup Files**: Global test setup and mocks
- **Coverage**: v8 provider with comprehensive reporting
- **Timeouts**: Configured for async operations

### Playwright Configuration

Key settings in `playwright.config.ts`:
- **Browsers**: Chromium, Firefox, Safari, Mobile
- **Retries**: 2 retries in CI, 0 locally
- **Parallelization**: Full parallel execution
- **Screenshots**: On failure only
- **Trace**: On first retry

### MSW Configuration

- **Server Setup**: Node.js environment for tests
- **Handlers**: Comprehensive API endpoint mocking
- **Data Factories**: Type-safe mock data generation

## 📊 Coverage Goals

### Target Coverage Levels
- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Coverage Exclusions
- Test files themselves
- Configuration files
- Build artifacts
- Third-party code

## 🚨 Accessibility Testing

### Tools Used
- **axe-core**: Automated accessibility testing
- **vitest-axe**: Vitest integration for axe
- **Custom Rules**: Project-specific accessibility rules

### Key Accessibility Checks
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and roles
- **Color Contrast**: WCAG 2.1 AA compliance
- **Semantic HTML**: Proper heading hierarchy and landmarks

## 🔄 Continuous Integration

### GitHub Actions Workflow

The CI pipeline includes:

1. **Unit Tests**: Component and utility function tests
2. **Integration Tests**: Page-level tests with API integration
3. **Accessibility Tests**: Automated a11y validation
4. **Contract Tests**: Smart contract functionality tests
5. **E2E Tests**: Full user journey validation
6. **Security Tests**: Dependency and code security scanning
7. **Performance Tests**: Bundle size and Lighthouse audits

### Quality Gates

All tests must pass for:
- Pull request approval
- Merge to main branch
- Deployment to staging/production

## 🐛 Debugging Tests

### Common Issues

1. **Test Timeouts**
   ```typescript
   // Increase timeout for slow operations
   test.setTimeout(30000);
   ```

2. **Async Operations**
   ```typescript
   // Use waitFor for async updates
   await waitFor(() => {
     expect(screen.getByText('Updated')).toBeInTheDocument();
   });
   ```

3. **Mock Cleanup**
   ```typescript
   // Clear mocks between tests
   beforeEach(() => {
     vi.clearAllMocks();
   });
   ```

### Debug Commands

```bash
# Run single test file
npm run test:ui src/components/Header.test.tsx

# Run tests with debug output
npm run test:ui:dev

# Debug E2E tests
npm run test:playwright:debug

# View test coverage report
npm run test:ui:coverage && open coverage/index.html
```

## 📈 Performance Testing

### Bundle Size Monitoring
- **Maximum Bundle Size**: 500KB (gzipped)
- **CSS Bundle Size**: 50KB (gzipped)
- **Vendor Bundle Size**: 300KB (gzipped)

### Lighthouse Audits
- **Performance**: 80+ score
- **Accessibility**: 90+ score
- **Best Practices**: 80+ score
- **SEO**: 80+ score

## 🤝 Contributing

### Before Submitting PRs

1. Run full test suite: `npm run test:all:ui`
2. Check coverage is maintained
3. Ensure accessibility tests pass
4. Add tests for new features
5. Update test documentation if needed

### Test Naming Conventions

- **Unit Tests**: `Component.test.tsx`
- **Integration Tests**: `Component.integration.test.tsx`
- **Accessibility Tests**: `Component.a11y.test.tsx`
- **E2E Tests**: `feature.spec.ts`

### Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on user interactions and outcomes
   - Avoid testing internal component state

2. **Use Semantic Queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Mock External Dependencies**
   - Mock API calls, external services
   - Use realistic mock data

4. **Test Accessibility**
   - Include accessibility tests for all components
   - Test keyboard navigation and screen reader support

5. **Keep Tests Maintainable**
   - Use page object models for E2E tests
   - Extract common test utilities
   - Keep tests focused and isolated

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

For questions about testing or to report issues with the test suite, please open an issue or reach out to the development team.