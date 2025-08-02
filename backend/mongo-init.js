// MongoDB initialization script for Squdy Platform

db = db.getSiblingDB('squdy-platform');

// Create collections with validation
db.createCollection('campaigns', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['contractId', 'name', 'description', 'status'],
      properties: {
        contractId: {
          bsonType: 'int',
          minimum: 1
        },
        name: {
          bsonType: 'string',
          minLength: 1
        },
        description: {
          bsonType: 'string',
          minLength: 1
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'active', 'paused', 'finished', 'burned']
        }
      }
    }
  }
});

db.createCollection('participants', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['walletAddress', 'campaignId', 'stakeTxHash'],
      properties: {
        walletAddress: {
          bsonType: 'string',
          pattern: '^0x[a-fA-F0-9]{40}$'
        },
        stakeTxHash: {
          bsonType: 'string',
          pattern: '^0x[a-fA-F0-9]{64}$'
        }
      }
    }
  }
});

// Create indexes
db.campaigns.createIndex({ contractId: 1 }, { unique: true });
db.campaigns.createIndex({ status: 1, startDate: 1 });
db.campaigns.createIndex({ endDate: 1 });
db.campaigns.createIndex({ createdAt: -1 });

db.participants.createIndex({ walletAddress: 1, campaignId: 1 }, { unique: true });
db.participants.createIndex({ campaignId: 1, isWinner: 1 });
db.participants.createIndex({ stakeTxHash: 1 }, { unique: true });
db.participants.createIndex({ joinedAt: -1 });

print('MongoDB initialized successfully for Squdy Platform');