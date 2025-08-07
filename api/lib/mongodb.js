// MongoDB connection for Vercel serverless functions
import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const uri = process.env.MONGODB_URI;
const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};

let client;
let clientPromise;

// In production environment, reuse connections across serverless function invocations
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new connection for each invocation
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Helper function to get database
export async function getDatabase() {
  const client = await clientPromise;
  return client.db('squdy-platform');
}

// Helper function to close connection (for cleanup)
export async function closeConnection() {
  if (client) {
    await client.close();
  }
}
