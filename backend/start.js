#!/usr/bin/env node

// Production start script with MongoDB support
console.log('🚀 Starting Squdy Backend in Production Mode...');

// Change to backend directory if not already there
if (!process.cwd().endsWith('backend')) {
  process.chdir('backend');
}

// Check if MongoDB URI is provided
if (process.env.MONGODB_URI || process.env.MONGO_URL) {
  console.log('📋 Using MongoDB backend (full database functionality)');
  require('./mongodb-server.js');
} else {
  console.log('📋 No MongoDB URI provided, using simple-server.js (in-memory)');
  console.log('💡 Set MONGODB_URI environment variable for full database functionality');
  require('./simple-server.js');
}