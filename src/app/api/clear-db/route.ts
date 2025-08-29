import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'Clear database only available in development'
    }, { status: 403 });
  }

  try {
    console.log('Clearing MongoDB database...');
    
    const { db } = await connectToDatabase();
    const collection = db.collection('daily_news');
    
    // Clear all documents
    const result = await collection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents`);
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${result.deletedCount} documents from database`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
