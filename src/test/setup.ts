import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { server } from './mocks/server';
import { cleanup } from '@testing-library/react';
import ResizeObserver from 'resize-observer-polyfill';

// Setup MSW
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});

// Mock ResizeObserver
global.ResizeObserver = ResizeObserver;

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Keep error and warn for debugging
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_API_BASE_URL: 'http://localhost:3001/api',
    VITE_SOCKET_URL: 'http://localhost:3001',
    VITE_SQUDY_TOKEN_ADDRESS: '0x1234567890123456789012345678901234567890',
    VITE_CAMPAIGN_MANAGER_ADDRESS: '0x0987654321098765432109876543210987654321',
    VITE_NETWORK: 'sepolia',
    VITE_ETHERSCAN_URL: 'https://sepolia.etherscan.io',
    VITE_PANCAKESWAP_URL: 'https://pancakeswap.finance/swap',
    MODE: 'test',
  },
}));

// Mock Web3 provider
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      }),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 11155111 }),
      send: vi.fn(),
    })),
    Contract: vi.fn().mockImplementation(() => ({
      balanceOf: vi.fn().mockResolvedValue('1000000000000000000000'),
      allowance: vi.fn().mockResolvedValue('1000000000000000000000'),
      approve: vi.fn().mockResolvedValue({ hash: '0xtxhash', wait: vi.fn() }),
      getCampaign: vi.fn().mockResolvedValue([
        'Test Campaign',
        'Campaign description',
        1000,
        10000,
        100,
        0,
        true,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400 * 7,
      ]),
    })),
    formatUnits: vi.fn().mockImplementation((value) => value.toString()),
    parseUnits: vi.fn().mockImplementation((value) => value.toString()),
    JsonRpcProvider: vi.fn(),
  },
}));

// Mock react-router-dom for tests that don't explicitly test routing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '1' }),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock Socket.io
vi.mock('socket.io-client', () => ({
  io: vi.fn().mockReturnValue({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  }),
}));

// Global test timeout
vi.setConfig({ testTimeout: 10000 });