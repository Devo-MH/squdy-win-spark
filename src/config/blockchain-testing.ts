/**
 * Blockchain Testing Configuration
 * Comprehensive testing setup for validating real-world blockchain functionality
 */

export const BLOCKCHAIN_NETWORKS = {
  // Local development networks
  HARDHAT: {
    name: 'Hardhat Local',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    blockExplorer: 'http://localhost:8545',
    currency: 'ETH',
    testnet: true,
    gasPrice: '20000000000', // 20 gwei
  },
  ANVIL: {
    name: 'Anvil (Foundry)',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    blockExplorer: 'http://localhost:8545',
    currency: 'ETH',
    testnet: true,
    gasPrice: '20000000000',
  },
  
  // Public testnets
  SEPOLIA: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/${INFURA_API_KEY}',
    blockExplorer: 'https://sepolia.etherscan.io',
    currency: 'SepoliaETH',
    testnet: true,
    gasPrice: '30000000000', // 30 gwei
    faucets: [
      'https://sepoliafaucet.com/',
      'https://www.alchemy.com/faucets/ethereum-sepolia',
    ],
  },
  GOERLI: {
    name: 'Goerli Testnet',
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/${INFURA_API_KEY}',
    blockExplorer: 'https://goerli.etherscan.io',
    currency: 'GoerliETH',
    testnet: true,
    gasPrice: '25000000000', // 25 gwei
    faucets: [
      'https://goerlifaucet.com/',
      'https://faucet.quicknode.com/ethereum/goerli',
    ],
  },
  
  // Polygon testnets
  MUMBAI: {
    name: 'Polygon Mumbai',
    chainId: 80001,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
    blockExplorer: 'https://mumbai.polygonscan.com',
    currency: 'MATIC',
    testnet: true,
    gasPrice: '30000000000',
    faucets: [
      'https://faucet.polygon.technology/',
    ],
  },
};

export const TESTING_SCENARIOS = {
  // Basic functionality tests
  BASIC_FLOW: {
    name: 'Basic Winner Selection & Token Burning',
    description: 'Test the complete flow from campaign creation to token burning',
    steps: [
      'Deploy contracts',
      'Create campaign',
      'Add participants',
      'Close campaign',
      'Select winners',
      'Burn remaining tokens',
      'Validate final state',
    ],
  },
  
  // Edge cases
  EDGE_CASES: {
    name: 'Edge Case Testing',
    description: 'Test various edge cases and error conditions',
    scenarios: [
      'No participants in campaign',
      'Only one participant',
      'Maximum participants',
      'Insufficient gas',
      'Contract not authorized',
      'Invalid campaign state',
    ],
  },
  
  // Gas optimization
  GAS_TESTING: {
    name: 'Gas Usage Analysis',
    description: 'Analyze gas consumption for optimization',
    metrics: [
      'selectWinners gas cost',
      'burnAllTokens gas cost',
      'Cost per participant',
      'Batch operations efficiency',
    ],
  },
};

export const VALIDATION_CHECKS = {
  PRE_DEPLOYMENT: [
    'Contract compilation successful',
    'No compilation warnings',
    'All tests pass locally',
    'Code coverage > 90%',
  ],
  
  POST_DEPLOYMENT: [
    'Contract addresses verified',
    'Contract source code published',
    'Initial state correct',
    'Admin functions accessible',
  ],
  
  FUNCTIONALITY: [
    'Winner selection randomness',
    'Token burning verification',
    'Event emission correct',
    'State transitions valid',
  ],
  
  SECURITY: [
    'Access control working',
    'Reentrancy protection',
    'Integer overflow protection',
    'Emergency pause functional',
  ],
};

export const TEST_CONFIGURATIONS = {
  DEVELOPMENT: {
    network: 'HARDHAT',
    verbose: true,
    skipGasAnalysis: false,
    mockExternalCalls: true,
  },
  
  STAGING: {
    network: 'SEPOLIA',
    verbose: true,
    skipGasAnalysis: false,
    mockExternalCalls: false,
  },
  
  PRODUCTION: {
    network: 'MAINNET',
    verbose: false,
    skipGasAnalysis: true,
    mockExternalCalls: false,
  },
};

/**
 * Gas estimation utilities
 */
export const GAS_LIMITS = {
  SELECT_WINNERS: {
    base: 100000,
    perParticipant: 25000,
    maxParticipants: 1000,
  },
  BURN_TOKENS: {
    base: 80000,
    perToken: 5000,
    maxTokens: 1000000,
  },
};

/**
 * Calculate estimated gas for operations
 */
export function estimateGas(operation: keyof typeof GAS_LIMITS, count: number): number {
  const config = GAS_LIMITS[operation];
  return config.base + (config.perParticipant || config.perToken || 0) * count;
}

/**
 * Validation helper functions
 */
export class BlockchainValidator {
  static async validateNetworkConnection(rpcUrl: string): Promise<boolean> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  static async validateContractDeployment(contractAddress: string, provider: any): Promise<boolean> {
    try {
      const code = await provider.getCode(contractAddress);
      return code !== '0x';
    } catch {
      return false;
    }
  }
  
  static validateGasEstimate(estimated: number, actual: number): { valid: boolean; efficiency: number } {
    const efficiency = (estimated / actual) * 100;
    return {
      valid: efficiency >= 80 && efficiency <= 120, // Within 20% is acceptable
      efficiency,
    };
  }
}