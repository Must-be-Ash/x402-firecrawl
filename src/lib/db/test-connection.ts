import { connectToDatabase } from './mongodb';

export async function testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Testing MongoDB connection...');
    
    const { db } = await connectToDatabase();
    
    // Test basic database operations
    const testCollection = db.collection('connection_test');
    
    // Insert a test document
    const testDoc = {
      timestamp: new Date(),
      test: true,
      message: 'Connection test successful'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('Test document inserted:', insertResult.insertedId);
    
    // Read the test document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('Test document found:', foundDoc);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('Test document cleaned up');
    
    // Test the daily_news collection exists and indexes are created
    const dailyNewsCollection = db.collection('daily_news');
    const indexes = await dailyNewsCollection.listIndexes().toArray();
    console.log('Daily news collection indexes:', indexes.map(idx => idx.name));
    
    return {
      success: true,
      message: `MongoDB connection successful. Database: ${db.databaseName}, Indexes: ${indexes.length}`
    };
    
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}