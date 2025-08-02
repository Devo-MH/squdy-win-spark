// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import Cypress code coverage
import '@cypress/code-coverage/support'

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // for unhandled promise rejections and other errors that don't affect the test
  if (err.message.includes('MetaMask') || err.message.includes('provider')) {
    return false
  }
  return true
})

// Custom commands for Web3 testing
Cypress.Commands.add('mockMetaMask', (accounts = ['0x1234567890123456789012345678901234567890']) => {
  cy.window().then((win) => {
    // Mock MetaMask provider
    win.ethereum = {
      isMetaMask: true,
      request: cy.stub().resolves(),
      on: cy.stub(),
      removeListener: cy.stub(),
      selectedAddress: accounts[0],
      chainId: '0x61', // BSC Testnet
      isConnected: () => true,
      _metamask: {
        isUnlocked: () => Promise.resolve(true)
      }
    }

    // Mock common requests
    win.ethereum.request.withArgs({ method: 'eth_requestAccounts' }).resolves(accounts)
    win.ethereum.request.withArgs({ method: 'eth_accounts' }).resolves(accounts)
    win.ethereum.request.withArgs({ method: 'eth_chainId' }).resolves('0x61')
    win.ethereum.request.withArgs({ method: 'net_version' }).resolves('97')
  })
})

Cypress.Commands.add('mockContract', (contractAddress: string, abi: any[], methods: any = {}) => {
  cy.window().then((win) => {
    // Mock ethers.js contract
    const mockContract = {
      address: contractAddress,
      functions: {},
      ...methods
    }

    // Mock common contract methods
    Object.keys(methods).forEach(methodName => {
      mockContract[methodName] = cy.stub().resolves(methods[methodName])
    })

    // Store contract in window for access
    win.mockContract = mockContract
  })
})

Cypress.Commands.add('loginAsAdmin', () => {
  cy.mockMetaMask(['0x123456789012345678901234567890123456789a']) // Admin wallet
  cy.visit('/admin')
  cy.get('[data-cy=connect-wallet]').click()
  cy.get('[data-cy=admin-panel]').should('be.visible')
})

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      mockMetaMask(accounts?: string[]): Chainable<void>
      mockContract(contractAddress: string, abi: any[], methods?: any): Chainable<void>
      loginAsAdmin(): Chainable<void>
    }
  }
}