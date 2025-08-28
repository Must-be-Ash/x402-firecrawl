import { MongoClient, Db } from 'mongodb';

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
}

let client: MongoClient;
let db: Db;

async function connectToDatabase() {
  try {
    if (global._mongoClient && global._mongoDb) {
      return { client: global._mongoClient, db: global._mongoDb };
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    client = new MongoClient(process.env.MONGODB_URI, options);
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    db = client.db(process.env.MONGODB_DB_NAME || 'news-app');

    // Create indexes for efficient querying
    await createIndexes(db);

    // Cache connection for development
    if (process.env.NODE_ENV === 'development') {
      global._mongoClient = client;
      global._mongoDb = db;
    }

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function createIndexes(database: Db) {
  try {
    const dailyNewsCollection = database.collection('daily_news');
    
    // Primary index for date-based queries
    await dailyNewsCollection.createIndex({ date: 1, timezone: 1 });
    
    // Performance monitoring index
    await dailyNewsCollection.createIndex({ createdAt: 1 });
    
    // Content search index (for future features)
    await dailyNewsCollection.createIndex({
      'articles.headline': 'text',
      'articles.summary': 'text'
    });
    
    // Cleanup operations index
    await dailyNewsCollection.createIndex({ lastUpdated: 1 });
    
    console.log('MongoDB indexes created successfully');
  } catch (error) {
    console.error('Failed to create indexes:', error);
    // Don't throw here - app can still work without indexes
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

export { connectToDatabase };
export type { Db, MongoClient };