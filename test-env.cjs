require('dotenv').config({ path: './backend/.env' });

console.log('🔍 Environment Check:');
console.log('PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
console.log('SEPOLIA_RPC_URL exists:', !!process.env.SEPOLIA_RPC_URL);
console.log('PRIVATE_KEY starts with 0x:', process.env.PRIVATE_KEY?.startsWith('0x'));
console.log('PRIVATE_KEY length:', process.env.PRIVATE_KEY?.length);

// Also check hardhat network config
const config = require('./hardhat.config.js');
console.log('Sepolia network accounts:', config.networks.sepolia.accounts.length);
