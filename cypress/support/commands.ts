/// <reference types="cypress" />

// Custom commands for API testing
Cypress.Commands.add('apiRequest', (method: string, url: string, body?: any, headers: any = {}) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    failOnStatusCode: false
  })
})

// Custom command for wallet signature simulation
Cypress.Commands.add('signMessage', (message: string, walletAddress: string) => {
  // Mock signature for testing
  const mockSignature = '0x' + 'a'.repeat(130) // Mock signature
  return cy.wrap({
    signature: mockSignature,
    message,
    walletAddress
  })
})

// Custom command for campaign creation flow
Cypress.Commands.add('createCampaign', (campaignData: any) => {
  cy.get('[data-cy=campaign-name]').type(campaignData.name)
  cy.get('[data-cy=campaign-description]').type(campaignData.description)
  cy.get('[data-cy=soft-cap]').type(campaignData.softCap.toString())
  cy.get('[data-cy=hard-cap]').type(campaignData.hardCap.toString())
  cy.get('[data-cy=ticket-amount]').type(campaignData.ticketAmount.toString())
  cy.get('[data-cy=start-date]').type(campaignData.startDate)
  cy.get('[data-cy=end-date]').type(campaignData.endDate)
  
  if (campaignData.imageUrl) {
    cy.get('[data-cy=image-url]').type(campaignData.imageUrl)
  }
  
  if (campaignData.prizes && campaignData.prizes.length > 0) {
    campaignData.prizes.forEach((prize: any, index: number) => {
      if (index > 0) {
        cy.get('[data-cy=add-prize]').click()
      }
      cy.get(`[data-cy=prize-name-${index}]`).type(prize.name)
      cy.get(`[data-cy=prize-value-${index}]`).type(prize.value.toString())
    })
  }
  
  cy.get('[data-cy=create-campaign-btn]').click()
})

// Custom command for campaign participation flow
Cypress.Commands.add('participateInCampaign', (stakeAmount: number) => {
  cy.get('[data-cy=stake-amount]').clear().type(stakeAmount.toString())
  cy.get('[data-cy=approve-tokens]').click()
  cy.wait(1000) // Wait for approval
  cy.get('[data-cy=stake-tokens]').click()
})

// Custom command for social task completion
Cypress.Commands.add('completeSocialTasks', () => {
  const tasks = ['twitter-follow', 'twitter-like', 'twitter-retweet', 'discord-join', 'telegram-join', 'medium-follow', 'newsletter-subscribe']
  
  tasks.forEach(task => {
    cy.get(`[data-cy=${task}]`).click()
    cy.wait(500) // Wait for task completion
  })
})

// Data attribute selectors for better testing
Cypress.Commands.add('getByData', (selector: string) => {
  return cy.get(`[data-cy=${selector}]`)
})

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      apiRequest(method: string, url: string, body?: any, headers?: any): Chainable<any>
      signMessage(message: string, walletAddress: string): Chainable<any>
      createCampaign(campaignData: any): Chainable<void>
      participateInCampaign(stakeAmount: number): Chainable<void>
      completeSocialTasks(): Chainable<void>
      getByData(selector: string): Chainable<JQuery<HTMLElement>>
    }
  }
}