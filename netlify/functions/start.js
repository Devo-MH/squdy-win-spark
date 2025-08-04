// Netlify serverless function for Squdy backend
const serverlessHttp = require('serverless-http');

// Load the correct server based on environment
let app;
if (process.env.MONGODB_URI || process.env.MONGO_URL) {
  console.log('📋 Using MongoDB backend');
  app = require('../../backend/mongodb-server.js');
} else {
  console.log('📋 Using simple backend');
  app = require('../../backend/simple-server.js');
}

// Export the serverless handler
exports.handler = serverlessHttp(app);