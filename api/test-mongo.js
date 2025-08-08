export default async function handler(req, res) {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      return res.json({ 
        error: 'MONGODB_URI not set',
        hasUri: false,
        env: Object.keys(process.env).filter(k => k.includes('MONGO')).join(', ')
      });
    }

    // Try to import and connect
    const { getDatabase } = await import('./lib/mongodb.js');
    const db = await getDatabase();
    
    // Test basic operations
    const col = db.collection('campaigns');
    const count = await col.countDocuments({});
    const sample = await col.findOne({});
    
    res.json({ 
      success: true,
      hasUri: true,
      dbName: db.databaseName,
      totalCampaigns: count,
      sampleCampaign: sample ? {
        id: sample._id,
        name: sample.name,
        contractId: sample.contractId,
        contractIdType: typeof sample.contractId
      } : null
    });
    
  } catch (error) {
    res.json({ 
      error: error.message,
      stack: error.stack,
      hasUri: !!process.env.MONGODB_URI
    });
  }
}
