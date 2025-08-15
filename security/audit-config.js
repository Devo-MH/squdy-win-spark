// Security audit configuration for Squdy platform
module.exports = {
  // Smart contract security settings
  contracts: {
    compiler: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true
      }
    },
    networks: {
      hardhat: {
        chainId: 31337
      },
      bscTestnet: {
        chainId: 97,
        url: process.env.BSC_TESTNET_RPC_URL
      },
      bscMainnet: {
        chainId: 56,
        url: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org'
      }
    },
    vulnerabilities: {
      // Check for common vulnerabilities
      reentrancy: true,
      integerOverflow: true,
      accessControl: true,
      frontRunning: true,
      timestampDependence: true,
      uncheckedSend: true,
      delegateCall: true,
      randomness: true
    }
  },

  // Backend API security settings
  backend: {
    dependencies: {
      // Check for vulnerable dependencies
      audit: true,
      severity: ['critical', 'high', 'moderate'],
      exclude: []
    },
    headers: {
      // Security headers validation
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      originAgentCluster: true,
      referrerPolicy: true,
      strictTransportSecurity: true,
      xContentTypeOptions: true,
      xDnsPrefetchControl: true,
      xDownloadOptions: true,
      xFrameOptions: true,
      xPermittedCrossDomainPolicies: true,
      xPoweredBy: false,
      xXssProtection: true
    },
    authentication: {
      // Authentication security checks
      walletSignatureValidation: true,
      nonceValidation: true,
      timestampValidation: true,
      adminRoleValidation: true
    },
    input: {
      // Input validation and sanitization
      validation: true,
      sanitization: true,
      maxLength: 10000,
      allowedHtml: false,
      sqlInjection: true,
      xssProtection: true
    },
    rateLimit: {
      // Rate limiting configuration
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // Frontend security settings
  frontend: {
    dependencies: {
      audit: true,
      severity: ['critical', 'high'],
      exclude: ['GHSA-example'] // Example exclusion
    },
    build: {
      // Build security checks
      bundleAnalysis: true,
      sourceMaps: false, // Disable in production
      minimization: true,
      treeShaking: true
    },
    runtime: {
      // Runtime security checks
      contentSecurityPolicy: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.example.com", "wss://socket.example.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      web3Security: {
        walletValidation: true,
        networkValidation: true,
        contractAddressValidation: true,
        transactionValidation: true
      }
    }
  },

  // General security settings
  general: {
    secrets: {
      // Secrets scanning
      scan: true,
      patterns: [
        'private.*key',
        'secret.*key',
        'api.*key',
        'password',
        'token',
        'jwt.*secret',
        'database.*url'
      ]
    },
    encryption: {
      // Encryption standards
      minKeyLength: 256,
      algorithms: ['AES-256-GCM', 'RSA-2048'],
      hashingAlgorithms: ['SHA-256', 'bcrypt']
    },
    logging: {
      // Security logging
      authenticationAttempts: true,
      adminActions: true,
      failedRequests: true,
      suspiciousActivity: true,
      sensitiveDataMasking: true
    }
  },

  // Reporting settings
  reporting: {
    format: 'json',
    output: './security/audit-report.json',
    verbose: true,
    includeFixed: false,
    onlyProduction: false
  },

  // Exclusions and exceptions
  exclusions: {
    // Known false positives or accepted risks
    vulnerabilities: [],
    files: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**'
    ],
    severity: [] // Don't exclude any severity levels by default
  }
};