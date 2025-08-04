// Vercel serverless function for Squdy backend
console.log('📋 Vercel: Loading simple backend');

try {
  const app = require('../backend/simple-server.js');
  console.log('✅ Backend loaded successfully');
  
  // Export the handler function for Vercel
  module.exports = (req, res) => {
    console.log(`📥 Request: ${req.method} ${req.url}`);
    return app(req, res);
  };
} catch (error) {
  console.error('❌ Backend loading failed:', error);
  
  // Fallback handler
  module.exports = (req, res) => {
    res.status(500).json({ 
      error: 'Backend initialization failed',
      message: error.message 
    });
  };
}