// Simple monitoring setup for production deployment
// Zero-cost monitoring using free tiers

const monitoringConfig = {
  // Free error tracking with Sentry
  sentry: {
    dsn: "https://your-sentry-dsn@sentry.io/project-id",
    environment: "production",
    tracesSampleRate: 1.0,
  },
  
  // Free uptime monitoring with UptimeRobot
  uptimeRobot: {
    monitors: [
      {
        name: "Squdy Frontend",
        url: "https://squdy-win-spark.vercel.app",
        type: "HTTP",
        interval: 300, // 5 minutes
      },
      {
        name: "Squdy Backend API",
        url: "https://squdy-backend.railway.app/health",
        type: "HTTP",  
        interval: 300,
      }
    ]
  },
  
  // Free analytics with Google Analytics 4
  googleAnalytics: {
    measurementId: "G-XXXXXXXXXX",
    events: [
      "wallet_connected",
      "campaign_created", 
      "stake_completed",
      "task_completed",
      "campaign_joined"
    ]
  },
  
  // Simple health checks
  healthChecks: {
    frontend: "https://squdy-win-spark.vercel.app",
    backend: "https://squdy-backend.railway.app/health",
    contracts: {
      token: "0x1234567890123456789012345678901234567890",
      manager: "0x0987654321098765432109876543210987654321",
      network: "sepolia"
    }
  }
};

// Basic monitoring script
async function setupMonitoring() {
  console.log('📊 Setting up monitoring...');
  
  // 1. Add Sentry to React app
  const sentrySetup = `
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "${monitoringConfig.sentry.dsn}",
  environment: "${monitoringConfig.sentry.environment}",
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: ${monitoringConfig.sentry.tracesSampleRate},
});
`;

  // 2. Add Google Analytics
  const gaSetup = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${monitoringConfig.googleAnalytics.measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${monitoringConfig.googleAnalytics.measurementId}');
</script>
`;

  // 3. Health check endpoint for backend
  const healthCheck = `
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    contracts: {
      token: '${monitoringConfig.healthChecks.contracts.token}',
      manager: '${monitoringConfig.healthChecks.contracts.manager}',
      network: '${monitoringConfig.healthChecks.contracts.network}'
    }
  });
});
`;

  console.log('✅ Monitoring configuration ready!');
  console.log('\n📋 Next Steps:');
  console.log('1. Sign up for Sentry.io (free tier)');
  console.log('2. Create Google Analytics 4 property');
  console.log('3. Set up UptimeRobot monitors');
  console.log('4. Add monitoring code to your apps');
  
  return {
    sentrySetup,
    gaSetup, 
    healthCheck,
    config: monitoringConfig
  };
}

// Export for use in other scripts
module.exports = { setupMonitoring, monitoringConfig };

// Run if called directly
if (require.main === module) {
  setupMonitoring().catch(console.error);
}