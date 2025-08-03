#!/usr/bin/env node

// Production start script - always uses simple-server.js
// This ensures Railway uses the correct server regardless of other configurations

console.log('🚀 Starting Squdy Backend in Production Mode...');
console.log('📋 Using simple-server.js (no database required)');

// Change to backend directory if not already there
if (!process.cwd().endsWith('backend')) {
  process.chdir('backend');
}

// Start the simple server
require('./simple-server.js');