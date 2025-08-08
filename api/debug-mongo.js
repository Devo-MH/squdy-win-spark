import { getDatabase } from './lib/mongodb.js';

export default async function handler(req, res) {
  try {
    const db = await getDatabase();
    const col = db.collection('campaigns');
    const allRaw = await col.find({}).toArray();
    const withName = await col.find({ name: { $exists: true } }).toArray();
    const withNumericId = await col.find({ contractId: { $type: 'number' } }).toArray();
    
    res.json({ 
      ok: true,
      debug: {
        totalInDB: allRaw.length,
        withName: withName.length,
        withNumericId: withNumericId.length,
        sampleDocs: allRaw.map(doc => ({
          _id: doc._id,
          name: doc.name,
          contractId: doc.contractId,
          contractIdType: typeof doc.contractId
        }))
      }
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}
