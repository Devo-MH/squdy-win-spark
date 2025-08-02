import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Web3Provider } from '@/contexts/Web3Context';
import userEvent from '@testing-library/user-event';

// Custom render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
  useMemoryRouter?: boolean;
  routerProps?: any;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    queryClient,
    useMemoryRouter = true,
    routerProps = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create a fresh query client for each test if not provided
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });

  // Choose router based on test needs
  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerPropsWithDefaults = useMemoryRouter 
    ? { initialEntries: [initialRoute], ...routerProps }
    : routerProps;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        <Web3Provider>
          <TooltipProvider>
            <Router {...routerPropsWithDefaults}>
              {children}
            </Router>
          </TooltipProvider>
        </Web3Provider>
      </QueryClientProvider>
    );
  }

  const user = userEvent.setup();

  return {
    user,
    queryClient: testQueryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Render function for testing routing specifically
export function renderWithRouter(
  ui: ReactElement,
  { initialRoute = '/', ...options }: Omit<CustomRenderOptions, 'useMemoryRouter'> = {}
) {
  return renderWithProviders(ui, {
    ...options,
    initialRoute,
    useMemoryRouter: true,
  });
}

// Render function for components that don't need routing
export function renderWithoutRouter(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'useMemoryRouter' | 'initialRoute'> = {}
) {
  const queryClient = options.queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Web3Provider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Web3Provider>
      </QueryClientProvider>
    );
  }

  const user = userEvent.setup();

  return {
    user,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Utility for testing components with specific query states
export function renderWithQueryState(
  ui: ReactElement,
  queryData: Record<string, any>,
  options: CustomRenderOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  // Pre-populate query cache
  Object.entries(queryData).forEach(([queryKey, data]) => {
    queryClient.setQueryData(JSON.parse(queryKey), data);
  });

  return renderWithProviders(ui, { ...options, queryClient });
}

// Utility for creating mock query clients with specific data
export function createMockQueryClient(initialData?: Record<string, any>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  if (initialData) {
    Object.entries(initialData).forEach(([queryKey, data]) => {
      queryClient.setQueryData(JSON.parse(queryKey), data);
    });
  }

  return queryClient;
}

// Wait utilities for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

export const waitForQueryToSettle = (queryClient: QueryClient) => 
  queryClient.getQueryCache().findAll().every(query => !query.state.isLoading);

// Mock hook utilities
export const mockUseCampaigns = (data: any, options: any = {}) => ({
  data,
  isLoading: options.isLoading || false,
  error: options.error || null,
  refetch: options.refetch || vi.fn(),
  isError: !!options.error,
  isSuccess: !options.isLoading && !options.error,
  ...options,
});

export const mockUseCampaign = (data: any, options: any = {}) => ({
  data,
  isLoading: options.isLoading || false,
  error: options.error || null,
  refetch: options.refetch || vi.fn(),
  isError: !!options.error,
  isSuccess: !options.isLoading && !options.error,
  ...options,
});

// Test data generators
export const generateTestCampaigns = (count: number = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    contractId: i + 1,
    name: `Test Campaign ${i + 1}`,
    description: `Description for campaign ${i + 1}`,
    imageUrl: `https://example.com/image-${i + 1}.jpg`,
    status: ['active', 'paused', 'finished'][i % 3] as const,
    currentAmount: (i + 1) * 1000,
    hardCap: (i + 1) * 10000,
    softCap: (i + 1) * 500,
    ticketAmount: 100,
    participantCount: (i + 1) * 10,
    startDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + (7 - i) * 24 * 60 * 60 * 1000).toISOString(),
    prizes: [
      { name: 'First Prize', value: 1000, currency: 'USD' },
      { name: 'Second Prize', value: 500, currency: 'USD' },
    ],
  }));
};

// Accessibility test helper
export const axeRules = {
  // Common rules to disable for component tests
  disableColorContrast: { 'color-contrast': { enabled: false } },
  disableLandmarks: { 'region': { enabled: false } },
  disableHeadings: { 'heading-order': { enabled: false } },
  
  // Strict rules for critical accessibility
  strictRules: {
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'button-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
  },
};

// Custom matchers and assertions
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveAccessibleName = (element: HTMLElement, name: string) => {
  expect(element).toHaveAccessibleName(name);
};

export const expectButtonToBeDisabled = (button: HTMLElement) => {
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-disabled', 'true');
};

export const expectFormToBeValid = (form: HTMLElement) => {
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    expect(input).toBeValid();
  });
};

// Re-export everything from testing library for convenience
export * from '@testing-library/react';
export { userEvent };

// Export vi for mocking
export { vi } from 'vitest';