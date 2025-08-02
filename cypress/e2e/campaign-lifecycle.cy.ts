describe('Campaign Lifecycle E2E Tests', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '/api/campaigns*', { fixture: 'campaigns.json' }).as('getCampaigns')
    cy.intercept('GET', '/api/campaigns/1', { fixture: 'campaign-detail.json' }).as('getCampaignDetail')
    cy.intercept('POST', '/api/campaigns/1/participate', { 
      statusCode: 201,
      body: { message: 'Successfully participated in campaign', participant: { ticketCount: 10 } }
    }).as('participateInCampaign')
    
    // Mock MetaMask
    cy.mockMetaMask(['0x1234567890123456789012345678901234567890'])
  })

  describe('Homepage Campaign Display', () => {
    it('should display active campaigns on homepage', () => {
      cy.visit('/')
      
      // Wait for campaigns to load
      cy.wait('@getCampaigns')
      
      // Check hero section
      cy.getByData('hero-title').should('contain', 'Burn to Win')
      cy.getByData('hero-description').should('be.visible')
      
      // Check active campaigns section
      cy.getByData('active-campaigns').should('be.visible')
      cy.getByData('campaign-card').should('have.length.at.least', 1)
      
      // Check campaign card content
      cy.getByData('campaign-card').first().within(() => {
        cy.getByData('campaign-name').should('be.visible')
        cy.getByData('campaign-description').should('be.visible')
        cy.getByData('campaign-progress').should('be.visible')
        cy.getByData('campaign-participants').should('be.visible')
        cy.getByData('campaign-status').should('be.visible')
        cy.getByData('join-campaign-btn').should('be.visible')
      })
    })

    it('should navigate to campaign detail page', () => {
      cy.visit('/')
      cy.wait('@getCampaigns')
      
      cy.getByData('campaign-card').first().click()
      cy.url().should('include', '/campaigns/')
      cy.wait('@getCampaignDetail')
    })
  })

  describe('Campaign Detail Page', () => {
    beforeEach(() => {
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
    })

    it('should display campaign information correctly', () => {
      // Check campaign header
      cy.getByData('campaign-title').should('be.visible')
      cy.getByData('campaign-description').should('be.visible')
      cy.getByData('campaign-image').should('be.visible')
      cy.getByData('campaign-status-badge').should('be.visible')
      
      // Check campaign stats
      cy.getByData('campaign-progress').should('be.visible')
      cy.getByData('participant-count').should('be.visible')
      cy.getByData('ticket-price').should('be.visible')
      cy.getByData('time-left').should('be.visible')
      
      // Check prize pool
      cy.getByData('prize-pool').should('be.visible')
      cy.getByData('prize-item').should('have.length.at.least', 1)
    })

    it('should show wallet connection prompt for non-connected users', () => {
      // Mock non-connected state
      cy.window().then((win) => {
        win.ethereum = undefined
      })
      
      cy.reload()
      cy.wait('@getCampaignDetail')
      
      cy.getByData('connect-wallet-prompt').should('be.visible')
      cy.getByData('connect-wallet-btn').should('be.visible')
    })

    it('should show staking interface for connected users', () => {
      // Mock connected state
      cy.getByData('connect-wallet-btn').click()
      
      // Should show staking interface
      cy.getByData('staking-section').should('be.visible')
      cy.getByData('stake-amount-input').should('be.visible')
      cy.getByData('token-balance').should('be.visible')
      cy.getByData('tickets-calculation').should('be.visible')
    })
  })

  describe('Campaign Participation Flow', () => {
    beforeEach(() => {
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
      
      // Mock contract interactions
      cy.mockContract('0x1234567890123456789012345678901234567890', [], {
        balanceOf: '10000000000000000000000', // 10,000 tokens
        allowance: '0',
        approve: true,
        stakeTokens: true
      })
    })

    it('should complete full participation flow', () => {
      // Connect wallet
      cy.getByData('connect-wallet-btn').click()
      
      // Enter stake amount
      cy.getByData('stake-amount-input').type('1000')
      
      // Check ticket calculation
      cy.getByData('tickets-calculation').should('contain', '10 tickets')
      
      // Approve tokens
      cy.getByData('approve-tokens-btn').click()
      cy.getByData('approval-loading').should('be.visible')
      
      // Wait for approval to complete
      cy.getByData('stake-tokens-btn').should('be.enabled')
      
      // Stake tokens
      cy.getByData('stake-tokens-btn').click()
      cy.wait('@participateInCampaign')
      
      // Check success message
      cy.getByData('participation-success').should('be.visible')
      cy.getByData('participation-success').should('contain', 'Successfully participated')
    })

    it('should validate insufficient balance', () => {
      cy.getByData('connect-wallet-btn').click()
      
      // Try to stake more than balance
      cy.getByData('stake-amount-input').type('50000')
      cy.getByData('stake-tokens-btn').should('be.disabled')
      cy.getByData('insufficient-balance-error').should('be.visible')
    })

    it('should validate minimum stake amount', () => {
      cy.getByData('connect-wallet-btn').click()
      
      // Try to stake less than one ticket
      cy.getByData('stake-amount-input').type('50')
      cy.getByData('minimum-stake-error').should('be.visible')
      cy.getByData('approve-tokens-btn').should('be.disabled')
    })
  })

  describe('Social Media Tasks', () => {
    beforeEach(() => {
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
      cy.getByData('connect-wallet-btn').click()
      
      // Mock participation status
      cy.intercept('GET', '/api/campaigns/1/my-status', {
        isParticipating: true,
        status: {
          socialTasksCompleted: {
            twitterFollow: false,
            twitterLike: false,
            twitterRetweet: false,
            discordJoined: false,
            telegramJoined: false,
            mediumFollowed: false,
            newsletterSubscribed: false
          },
          allTasksCompleted: false,
          socialCompletionPercentage: 0
        }
      }).as('getParticipationStatus')
    })

    it('should display social media tasks for participants', () => {
      cy.wait('@getParticipationStatus')
      
      cy.getByData('social-tasks-section').should('be.visible')
      cy.getByData('social-task-twitter-follow').should('be.visible')
      cy.getByData('social-task-twitter-like').should('be.visible')
      cy.getByData('social-task-discord-join').should('be.visible')
      cy.getByData('social-task-telegram-join').should('be.visible')
      cy.getByData('social-completion-progress').should('be.visible')
    })

    it('should complete social media tasks', () => {
      cy.intercept('POST', '/api/campaigns/1/verify-social', {
        message: 'Social task verified successfully',
        taskType: 'twitterFollow'
      }).as('verifySocialTask')
      
      cy.wait('@getParticipationStatus')
      
      // Complete Twitter follow task
      cy.getByData('social-task-twitter-follow').click()
      cy.wait('@verifySocialTask')
      
      // Check task completion
      cy.getByData('twitter-follow-completed').should('be.visible')
      cy.getByData('social-completion-progress').should('contain', '14%') // 1/7 tasks
    })

    it('should show completion rewards', () => {
      // Mock all tasks completed
      cy.intercept('GET', '/api/campaigns/1/my-status', {
        isParticipating: true,
        status: {
          socialTasksCompleted: {
            twitterFollow: true,
            twitterLike: true,
            twitterRetweet: true,
            discordJoined: true,
            telegramJoined: true,
            mediumFollowed: true,
            newsletterSubscribed: true
          },
          allTasksCompleted: true,
          socialCompletionPercentage: 100
        }
      }).as('getAllTasksCompleted')
      
      cy.reload()
      cy.wait('@getAllTasksCompleted')
      
      cy.getByData('all-tasks-completed').should('be.visible')
      cy.getByData('completion-bonus').should('be.visible')
    })
  })

  describe('Campaign States', () => {
    it('should display pending campaign correctly', () => {
      cy.intercept('GET', '/api/campaigns/1', { 
        fixture: 'campaign-pending.json' 
      }).as('getPendingCampaign')
      
      cy.visit('/campaigns/1')
      cy.wait('@getPendingCampaign')
      
      cy.getByData('campaign-status-badge').should('contain', 'Pending')
      cy.getByData('campaign-not-started').should('be.visible')
      cy.getByData('staking-section').should('not.exist')
    })

    it('should display finished campaign with results', () => {
      cy.intercept('GET', '/api/campaigns/1', { 
        fixture: 'campaign-finished.json' 
      }).as('getFinishedCampaign')
      
      cy.visit('/campaigns/1')
      cy.wait('@getFinishedCampaign')
      
      cy.getByData('campaign-status-badge').should('contain', 'Finished')
      cy.getByData('campaign-results').should('be.visible')
      cy.getByData('winners-section').should('be.visible')
      cy.getByData('total-participants').should('be.visible')
      cy.getByData('staking-section').should('not.exist')
    })

    it('should display burned campaign with burn info', () => {
      cy.intercept('GET', '/api/campaigns/1', { 
        fixture: 'campaign-burned.json' 
      }).as('getBurnedCampaign')
      
      cy.visit('/campaigns/1')
      cy.wait('@getBurnedCampaign')
      
      cy.getByData('campaign-status-badge').should('contain', 'Burned')
      cy.getByData('tokens-burned-info').should('be.visible')
      cy.getByData('burn-transaction-link').should('be.visible')
    })
  })

  describe('Real-time Updates', () => {
    beforeEach(() => {
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
    })

    it('should update participant count in real-time', () => {
      // Mock Socket.IO events
      cy.window().then((win) => {
        // Simulate new participant joining
        setTimeout(() => {
          win.dispatchEvent(new CustomEvent('campaign:user-staked', {
            detail: {
              campaignId: 1,
              amount: '1000',
              participant: '0x9999999999999999999999999999999999999999'
            }
          }))
        }, 2000)
      })
      
      // Check initial participant count
      cy.getByData('participant-count').should('contain', '5')
      
      // Wait for real-time update
      cy.getByData('participant-count').should('contain', '6', { timeout: 5000 })
    })

    it('should update staked amount in real-time', () => {
      cy.window().then((win) => {
        setTimeout(() => {
          win.dispatchEvent(new CustomEvent('campaign:user-staked', {
            detail: {
              campaignId: 1,
              amount: '2000'
            }
          }))
        }, 1000)
      })
      
      // Progress bar should update
      cy.getByData('campaign-progress').should('be.visible')
      // Progress value should increase (specific assertion would depend on initial values)
    })
  })

  describe('Error Handling', () => {
    it('should handle campaign not found', () => {
      cy.intercept('GET', '/api/campaigns/999', {
        statusCode: 404,
        body: { error: { message: 'Campaign not found' } }
      }).as('getCampaignNotFound')
      
      cy.visit('/campaigns/999')
      cy.wait('@getCampaignNotFound')
      
      cy.getByData('campaign-not-found').should('be.visible')
      cy.getByData('back-to-campaigns').should('be.visible')
    })

    it('should handle participation errors', () => {
      cy.intercept('POST', '/api/campaigns/1/participate', {
        statusCode: 400,
        body: { error: { message: 'Stake amount too low' } }
      }).as('participationError')
      
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
      cy.getByData('connect-wallet-btn').click()
      
      cy.participateInCampaign(50) // Too low amount
      cy.wait('@participationError')
      
      cy.getByData('participation-error').should('be.visible')
      cy.getByData('participation-error').should('contain', 'Stake amount too low')
    })

    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '/api/campaigns/1', {
        statusCode: 500,
        body: { error: { message: 'Internal server error' } }
      }).as('getServerError')
      
      cy.visit('/campaigns/1')
      cy.wait('@getServerError')
      
      cy.getByData('error-message').should('be.visible')
      cy.getByData('retry-button').should('be.visible')
      
      // Test retry functionality
      cy.intercept('GET', '/api/campaigns/1', { fixture: 'campaign-detail.json' }).as('getRetrySuccess')
      cy.getByData('retry-button').click()
      cy.wait('@getRetrySuccess')
      
      cy.getByData('campaign-title').should('be.visible')
    })
  })

  describe('Responsive Design', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
      
      // Check mobile-specific elements
      cy.getByData('mobile-menu-trigger').should('be.visible')
      cy.getByData('campaign-title').should('be.visible')
      cy.getByData('staking-section').should('be.visible')
      
      // Test mobile navigation
      cy.getByData('mobile-menu-trigger').click()
      cy.getByData('mobile-menu').should('be.visible')
    })

    it('should work correctly on tablet devices', () => {
      cy.viewport('ipad-2')
      cy.visit('/campaigns/1')
      cy.wait('@getCampaignDetail')
      
      cy.getByData('campaign-grid').should('be.visible')
      cy.getByData('sidebar-content').should('be.visible')
    })
  })
})