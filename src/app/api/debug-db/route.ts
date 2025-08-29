import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';

export async function GET() {
  try {
    console.log('Checking MongoDB database status...');
    
    const { db } = await connectToDatabase();
    const collection = db.collection('daily_news');
    
    // Get all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`Total documents in daily_news collection: ${allDocs.length}`);
    
    const dbStatus = {
      totalDocuments: allDocs.length,
      documents: allDocs.map(doc => ({
        date: doc.date,
        timezone: doc.timezone,
        articlesCount: doc.articles?.length || 0,
        createdAt: doc.createdAt,
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
