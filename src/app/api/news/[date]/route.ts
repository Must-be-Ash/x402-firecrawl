import { NextRequest, NextResponse } from 'next/server';
import { getNewsByDate } from '@/lib/db/operations';
import { validateDateParam } from '@/lib/utils/validators';
import { ErrorCode } from '@/lib/types/news';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/utils/constants';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get('timezone') || 'UTC';
    
    // Validate date parameter
    const validation = validateDateParam({ date });
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_DATE,
          message: validation.error.errors[0]?.message || ERROR_MESSAGES.INVALID_DATE,
          details: validation.error.errors
        }
      }, { status: HTTP_STATUS.BAD_REQUEST });
    }
    
    console.log(`API: Fetching cached news for ${date} (${timezone})`);
    
    const newsDocument = await getNewsByDate(date, timezone);
    
    if (!newsDocument || newsDocument.articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: ErrorCode.NO_DATA_FOUND,
          message: `No news data found for ${date}`,
        }
      }, { status: HTTP_STATUS.NOT_FOUND });
    }
    
    console.log(`API: Found ${newsDocument.articles.length} cached articles for ${date}`);
    
    return NextResponse.json({
      success: true,
      data: {
        date: newsDocument.date,
        articles: newsDocument.articles,
        cached: true,
        totalCount: newsDocument.articles.length,
        lastUpdated: newsDocument.lastUpdated,
        metadata: newsDocument.metadata
      }
    }, { 
      status: HTTP_STATUS.OK,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
    
  } catch (error: unknown) {
    const { date } = await params;
    console.error(`News API error for date ${date}:`, error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCode.DATABASE_ERROR,
        message: ERROR_MESSAGES.DATABASE_ERROR,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      }
    }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}