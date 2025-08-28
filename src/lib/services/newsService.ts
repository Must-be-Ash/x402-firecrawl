import { NewsArticle, ErrorCode } from '@/lib/types/news';
import { searchNews, generateNewsQuery } from './x402Service';
import { parseFirecrawlResponse, deduplicateArticles, filterRelevantNews } from '@/lib/utils/news-parser';
import { getNewsByDate, saveNewsForDate, checkNewsExists } from '@/lib/db/operations';
import { formatDateForAPI, isValidNewsDate } from '@/lib/utils/date-utils';

export class NewsServiceError extends Error {
  constructor(public code: ErrorCode, message: string, public details?: unknown) {
    super(message);
    this.name = 'NewsServiceError';
  }
}

export async function getTodaysNews(timezone: string = 'UTC'): Promise<NewsArticle[]> {
  const today = new Date();
  const dateStr = formatDateForAPI(today);
  const result = await getNewsByDate(dateStr, timezone);
  return result?.articles || [];
}

export async function getNewsByDateString(date: string, timezone: string = 'UTC'): Promise<NewsArticle[]> {
  // Validate date
  const dateObj = new Date(date);
  if (!isValidNewsDate(dateObj)) {
    throw new NewsServiceError(
      ErrorCode.INVALID_DATE, 
      'Invalid date provided or date is too old/in the future'
    );
  }

  try {
    // Check if we already have news for this date
    const existingNews = await getNewsByDate(date, timezone);
    
    if (existingNews && existingNews.articles.length > 0) {
      console.log(`Found cached news for ${date} (${timezone}): ${existingNews.articles.length} articles`);
      return existingNews.articles;
    }
    
    console.log(`No cached news for ${date} (${timezone}), fetching fresh news...`);
    
    // Fetch fresh news
    const freshArticles = await fetchFreshNews(date, timezone);
    
    // Cache the results
    if (freshArticles.length > 0) {
      await cacheNewsData(date, timezone, freshArticles, {
        searchQuery: generateNewsQuery(date, timezone),
        fetchDuration: 0 // We'll track this later
      });
    }
    
    return freshArticles;
    
  } catch (error) {
    console.error('Error in getNewsByDateString:', error);
    
    if (error instanceof NewsServiceError) {
      throw error;
    }
    
    throw new NewsServiceError(
      ErrorCode.DATABASE_ERROR,
      'Failed to retrieve or fetch news',
      error
    );
  }
}

export async function fetchFreshNews(date: string, timezone: string = 'UTC'): Promise<NewsArticle[]> {
  const startTime = Date.now();
  
  try {
    // Generate search query
    const query = generateNewsQuery(date, timezone);
    console.log(`Searching for news with query: "${query}"`);
    
    // Make Firecrawl API call via x402
    const response = await searchNews(query, {
      limit: 20,
      sources: ['web'],
      maxAge: 172800000 // 2 days
    });
    
    if (!response.success) {
      throw new NewsServiceError(
        ErrorCode.FIRECRAWL_ERROR,
        'Firecrawl API returned unsuccessful response',
        response
      );
    }
    
    // Parse the response
    const articles = parseFirecrawlResponse(response);
    
    // Filter relevant articles
    const relevantArticles = filterRelevantNews(articles, date);
    
    // Deduplicate
    const uniqueArticles = deduplicateArticles(relevantArticles);
    
    const duration = Date.now() - startTime;
    console.log(`Fetched ${uniqueArticles.length} unique articles in ${duration}ms`);
    
    return uniqueArticles;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Failed to fetch fresh news in ${duration}ms:`, error);
    
    if (error instanceof NewsServiceError) {
      throw error;
    }
    
    // Handle x402/payment related errors
    if (error instanceof Error && error.message.includes('payment')) {
      throw new NewsServiceError(
        ErrorCode.PAYMENT_FAILED,
        'Payment required to fetch news. Please ensure x402 wallet has sufficient funds.',
        error
      );
    }
    
    throw new NewsServiceError(
      ErrorCode.FIRECRAWL_ERROR,
      `Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}

export async function cacheNewsData(
  date: string, 
  timezone: string, 
  articles: NewsArticle[],
  metadata: {
    searchQuery: string;
    firecrawlCost?: number;
    fetchDuration?: number;
  }
): Promise<void> {
  try {
    await saveNewsForDate(date, timezone, articles, metadata);
    console.log(`Cached ${articles.length} articles for ${date} (${timezone})`);
  } catch (error) {
    console.error('Failed to cache news data:', error);
    // Don't throw here - caching failure shouldn't break the main flow
  }
}

export async function getAvailableNewsDates(limit: number = 90): Promise<Date[]> {
  try {
    // This would ideally come from a database query
    // For now, we'll return dates that we know might have data
    const dates: Date[] = [];
    const today = new Date();
    
    // Add today and last 30 days
    for (let i = 0; i < Math.min(limit, 30); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    return dates;
    
  } catch (error) {
    console.warn('Failed to get available news dates:', error);
    return [new Date()]; // Return at least today
  }
}

// Health check function for news service
export async function checkNewsServiceHealth(): Promise<{
  database: boolean;
  firecrawl: boolean;
  x402: boolean;
  message: string;
}> {
  const health = {
    database: false,
    firecrawl: false, 
    x402: false,
    message: ''
  };
  
  const messages: string[] = [];
  
  try {
    // Test database
    const testDate = formatDateForAPI(new Date());
    await checkNewsExists(testDate, 'UTC');
    health.database = true;
    messages.push('Database: OK');
  } catch {
    messages.push('Database: Error');
  }
  
  try {
    // Test Firecrawl/x402 (skip in development to avoid costs)
    if (process.env.NODE_ENV === 'production') {
      const testArticles = await fetchFreshNews(formatDateForAPI(new Date()), 'UTC');
      health.firecrawl = true;
      health.x402 = true;
      messages.push(`Firecrawl/x402: OK (${testArticles.length} articles)`);
    } else {
      messages.push('Firecrawl/x402: Skipped in development');
    }
  } catch (error) {
    messages.push(`Firecrawl/x402: Error - ${error instanceof Error ? error.message : 'Unknown'}`);
  }
  
  health.message = messages.join(', ');
  return health;
}