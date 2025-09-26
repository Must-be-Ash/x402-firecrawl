import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

export async function GET() {
  try {
    console.log('Checking MongoDB database status...');
    
    const { db } = await connectToDatabase();
    
    // Get database name and connection info
    const dbName = db.databaseName;
    const mongoUri = process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'); // Hide credentials
    const mongoDbName = process.env.MONGODB_DB_NAME || 'news-app';
    
    console.log(`Connected to database: ${dbName}`);
    console.log(`Expected database name: ${mongoDbName}`);
    console.log(`MongoDB URI pattern: ${mongoUri}`);
    
    const collection = db.collection('daily_news');
    
    // Get all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`Total documents in daily_news collection: ${allDocs.length}`);
    
    // List all collections in the database
    const collections = await db.listCollections().toArray();
    console.log(`Collections in database: ${collections.map(c => c.name).join(', ')}`);
    
    const dbStatus = {
      databaseName: dbName,
      expectedDatabaseName: mongoDbName,
      mongoUriPattern: mongoUri,
      totalDocuments: allDocs.length,
      collections: collections.map(c => c.name),
      documents: allDocs.map(doc => ({
        _id: doc._id,
        date: doc.date,
        timezone: doc.timezone,
        articlesCount: doc.articles?.length || 0,
        createdAt: doc.createdAt,
        lastUpdated: doc.lastUpdated,
        metadata: doc.metadata
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: dbStatus
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
