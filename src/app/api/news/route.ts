import { NextRequest, NextResponse } from 'next/server';
import { getNewsByDateString } from '@/lib/services/newsService';
import { validateNewsRequest } from '@/lib/utils/validators';
import { getTodayInTimezone } from '@/lib/utils/date-utils';
import { ErrorCode } from '@/lib/types/news';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/utils/constants';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const timezoneParam = searchParams.get('timezone') || 'UTC';
    
    // Validate request parameters
    const validation = validateNewsRequest({
      date: dateParam,
      timezone: timezoneParam
    });
    
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
    
    const { date, timezone } = validation.data;
    
    // Use provided date or default to today in specified timezone
    const targetDate = date || getTodayInTimezone(timezone);
    
    console.log(`API: Fetching news for ${targetDate} (${timezone})`);
    
    const startTime = Date.now();
    const articles = await getNewsByDateString(targetDate, timezone);
    const fetchDuration = Date.now() - startTime;
    
    // Determine if this was served from cache
    const cached = fetchDuration < 1000; // If very fast, likely from cache
    
    console.log(`API: Returned ${articles.length} articles in ${fetchDuration}ms (cached: ${cached})`);
    
    return NextResponse.json({
      success: true,
      data: {
        date: targetDate,
        articles,
        cached,
        totalCount: articles.length,
        fetchDuration
      }
    }, { 
      status: HTTP_STATUS.OK,
      headers: {
        'Cache-Control': cached ? 'public, max-age=3600' : 'public, max-age=300', // Cache longer for cached data
      }
    });
    
  } catch (error: unknown) {
    console.error('News API error:', error);
    
    // Handle NewsServiceError with specific error codes
    if (error && typeof error === 'object' && 'code' in error) {
      const errorWithCode = error as { code: string; message?: string; details?: unknown };
      // Try to map the string code to ErrorCode enum, fallback to DATABASE_ERROR
      const errorCode = Object.values(ErrorCode).includes(errorWithCode.code as ErrorCode) 
        ? errorWithCode.code as ErrorCode 
        : ErrorCode.DATABASE_ERROR;
      const statusCode = getStatusCodeForError(errorCode);
      return NextResponse.json({
        success: false,
        error: {
          code: errorCode,
          message: errorWithCode.message,
          details: errorWithCode.details
        }
      }, { status: statusCode });
    }
    
    // Generic error response
    return NextResponse.json({
      success: false,
      error: {
        code: ErrorCode.DATABASE_ERROR,
        message: ERROR_MESSAGES.API_ERROR,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      }
    }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}

function getStatusCodeForError(errorCode: ErrorCode): number {
  switch (errorCode) {
    case ErrorCode.INVALID_DATE:
      return HTTP_STATUS.BAD_REQUEST;
    case ErrorCode.NO_DATA_FOUND:
      return HTTP_STATUS.NOT_FOUND;
    case ErrorCode.PAYMENT_FAILED:
      return HTTP_STATUS.BAD_GATEWAY;
    case ErrorCode.FIRECRAWL_ERROR:
      return HTTP_STATUS.BAD_GATEWAY;
    case ErrorCode.RATE_LIMITED:
      return HTTP_STATUS.TOO_MANY_REQUESTS;
    default:
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}