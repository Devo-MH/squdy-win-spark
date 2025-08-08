// MongoDB connection helper for Vercel serverless functions (resilient)
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';

let cachedClient = null;
let cachedPromise = null;

export async function getMongoClient() {
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  if (cachedClient) return cachedClient;
  if (!cachedPromise) {
    cachedPromise = new MongoClient(uri).connect().then((client) => {
      cachedClient = client;
      return client;
    });
  }
  return cachedPromise;
}

// Helper function to get database using the default DB in the URI
export async function getDatabase() {
  const client = await getMongoClient();
  // If the URI contains a database (mongodb+srv://.../mydb), client.db() uses it
  return client.db();
}

export default getMongoClient;
