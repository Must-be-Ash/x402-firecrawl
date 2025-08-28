import { NextRequest, NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/db/test-connection';
import { checkNewsServiceHealth } from '@/lib/services/newsService';
import { testFirecrawlConnection } from '@/lib/services/x402Service';

export async function GET(request: NextRequest) {
  try {
    console.log('Running health checks...');
    
    const dbTest = await testDatabaseConnection();
    const newsServiceHealth = await checkNewsServiceHealth();
    
    // Test Firecrawl only if explicitly requested (to avoid costs in dev)
    const testFirecrawl = request.nextUrl.searchParams.get('test_firecrawl') === 'true';
    let firecrawlTest = { success: false, message: 'Not tested (add ?test_firecrawl=true to test)' };
    
    if (testFirecrawl && process.env.X402_PRIVATE_KEY) {
      try {
        firecrawlTest = await testFirecrawlConnection();
      } catch (error) {
        firecrawlTest = {
          success: false,
          message: `Firecrawl test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    
    const allHealthy = dbTest.success && newsServiceHealth.database;
    
    const health = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        connected: dbTest.success,
        message: dbTest.message,
      },
      services: {
        mongodb: dbTest.success ? 'up' : 'down',
        newsService: newsServiceHealth.database ? 'up' : 'down',
        firecrawl: testFirecrawl ? (firecrawlTest.success ? 'up' : 'down') : 'not tested',
        x402: process.env.X402_PRIVATE_KEY ? (testFirecrawl ? (firecrawlTest.success ? 'up' : 'down') : 'not tested') : 'not configured'
      },
      details: {
        newsService: newsServiceHealth.message,
        firecrawl: firecrawlTest.message
      }
    };
    
    return NextResponse.json(health, {
      status: allHealthy ? 200 : 503
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}