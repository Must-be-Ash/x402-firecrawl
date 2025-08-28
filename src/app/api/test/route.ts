import { NextRequest, NextResponse } from 'next/server';
import { insertSampleNews } from '@/lib/utils/sample-data';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'Test endpoints only available in development'
    }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2025-08-27';
    const timezone = searchParams.get('timezone') || 'America/Vancouver';
    
    console.log(`TEST API: Inserting sample news for ${date} (${timezone})`);
    
    const success = await insertSampleNews(date, timezone);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `Sample news inserted for ${date} (${timezone})`,
        data: {
          date,
          timezone,
          articlesInserted: 5
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert sample news'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}