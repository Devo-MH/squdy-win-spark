// Vercel serverless function for Squdy backend
// Always use simple server for now (MongoDB can be added later)
console.log('📋 Vercel: Using simple backend');
const app = require('../backend/simple-server.js');

// Export the Express app directly for Vercel
module.exports = app;