import crypto from 'crypto';
import { NewsArticle, FirecrawlWebResult } from '@/lib/types/news';
import { sanitizeString } from './validators';

export function parseFirecrawlResponse(
  response: unknown
): NewsArticle[] {
  // Type guard to check if response has expected structure
  if (!response || typeof response !== 'object' || !('success' in response)) {
    return [];
  }

  const typedResponse = response as { success: boolean; data?: { web?: FirecrawlWebResult[] } };
  if (!typedResponse.success || !typedResponse.data || !typedResponse.data.web) {
    return [];
  }

  const articles: NewsArticle[] = [];
  const seenHashes = new Set<string>();

  for (const item of typedResponse.data.web) {
    try {
      const article = parseFirecrawlWebResult(item);
      
      // Skip duplicates
      if (seenHashes.has(article.metadata.contentHash)) {
        continue;
      }
      seenHashes.add(article.metadata.contentHash);
      
      articles.push(article);
    } catch (error) {
      console.warn('Failed to parse Firecrawl result:', error, item);
    }
  }

  console.log(`Parsed ${articles.length} unique articles from ${typedResponse.data.web.length} results`);
  return articles;
}

function parseFirecrawlWebResult(item: FirecrawlWebResult): NewsArticle {
  // Validate required fields
  if (!item.title || !item.url || !item.summary) {
    throw new Error('Missing required fields: title, url, or summary');
  }

  // Extract source name from URL
  const sourceName = extractSourceName(item.url);
  
  // Find favicon URL
  const favicon = extractFavicon(item);
  
  // Parse published date if available
  const publishedDate = extractPublishedDate(item);
  
  // Find image URL
  const imageUrl = extractImageUrl(item);
  
  // Generate content hash for deduplication
  const contentHash = generateContentHash(item.title, item.summary, item.url);
  
  // Create unique Firecrawl ID
  const firecrawlId = (item.metadata?.scrapeId as string) || `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    headline: sanitizeString(item.title),
    description: sanitizeString(item.description || item.summary),
    source: {
      name: sourceName,
      url: item.url,
      favicon: favicon
    },
    publishedDate: publishedDate,
    summary: sanitizeString(item.summary),
    imageUrl: imageUrl,
    metadata: {
      firecrawlId,
      scrapedAt: new Date(),
      contentHash
    }
  };
}

function extractSourceName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix
    const domain = hostname.replace(/^www\./, '');
    
    // Common news site mappings
    const siteNames: Record<string, string> = {
      'cnn.com': 'CNN',
      'bbc.com': 'BBC',
      'bbc.co.uk': 'BBC', 
      'reuters.com': 'Reuters',
      'ap.org': 'Associated Press',
      'nytimes.com': 'The New York Times',
      'wsj.com': 'The Wall Street Journal',
      'washingtonpost.com': 'The Washington Post',
      'theguardian.com': 'The Guardian',
      'ctvnews.ca': 'CTV News',
      'cbc.ca': 'CBC News',
      'globalnews.ca': 'Global News',
      'npr.org': 'NPR',
      'abcnews.go.com': 'ABC News',
      'nbcnews.com': 'NBC News',
      'cbsnews.com': 'CBS News',
      'foxnews.com': 'Fox News'
    };
    
    if (siteNames[domain]) {
      return siteNames[domain];
    }
    
    // Capitalize first letter and remove TLD for generic domains
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
    
  } catch {
    return 'Unknown Source';
  }
}

function extractFavicon(item: FirecrawlWebResult): string | undefined {
  // Try to get favicon from metadata
  if (item.metadata?.favicon) {
    return item.metadata.favicon as string;
  }
  
  // Generate likely favicon URL
  try {
    const url = new URL(item.url);
    return `${url.protocol}//${url.hostname}/favicon.ico`;
  } catch {
    return undefined;
  }
}

function extractPublishedDate(item: FirecrawlWebResult): Date | undefined {
  // Try to extract date from metadata
  const metadata = item.metadata;
  
  // Common date fields in metadata
  const dateFields = [
    'publishedTime',
    'datePublished', 
    'article:published_time',
    'dateCreated',
    'date'
  ];
  
  for (const field of dateFields) {
    if (metadata && metadata[field]) {
      const date = new Date(metadata[field] as string | number | Date);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // If no date found, return undefined
  return undefined;
}

function extractImageUrl(item: FirecrawlWebResult): string | undefined {
  // Try screenshot first
  if (item.screenshot) {
    return item.screenshot;
  }
  
  // Try og:image from metadata
  if (item.metadata?.['og:image']) {
    return item.metadata['og:image'] as string;
  }
  
  // Try twitter:image
  if (item.metadata?.['twitter:image']) {
    return item.metadata['twitter:image'] as string;
  }
  
  return undefined;
}

function generateContentHash(title: string, summary: string, url: string): string {
  const content = `${title}|${summary}|${url}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

export function validateNewsArticle(article: unknown): article is NewsArticle {
  return (
    typeof article === 'object' &&
    article !== null &&
    'headline' in article &&
    'summary' in article &&
    typeof (article as NewsArticle).headline === 'string' &&
    typeof (article as NewsArticle).summary === 'string' &&
    'source' in article &&
    typeof (article as NewsArticle).source === 'object' &&
    (article as NewsArticle).source !== null &&
    'name' in (article as NewsArticle).source &&
    'url' in (article as NewsArticle).source &&
    typeof (article as NewsArticle).source.name === 'string' &&
    typeof (article as NewsArticle).source.url === 'string' &&
    'metadata' in article &&
    typeof (article as NewsArticle).metadata === 'object' &&
    (article as NewsArticle).metadata !== null &&
    'firecrawlId' in (article as NewsArticle).metadata &&
    'contentHash' in (article as NewsArticle).metadata &&
    typeof (article as NewsArticle).metadata.firecrawlId === 'string' &&
    typeof (article as NewsArticle).metadata.contentHash === 'string'
  );
}

export function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seenHashes = new Set<string>();
  const unique: NewsArticle[] = [];
  
  for (const article of articles) {
    if (!seenHashes.has(article.metadata.contentHash)) {
      seenHashes.add(article.metadata.contentHash);
      unique.push(article);
    }
  }
  
  console.log(`Deduplicated ${articles.length} articles to ${unique.length} unique articles`);
  return unique;
}

export function filterRelevantNews(articles: NewsArticle[], date: string): NewsArticle[] {
  const targetDate = new Date(date);
  const dayBefore = new Date(targetDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(targetDate);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  return articles.filter(article => {
    // If no published date, include it
    if (!article.publishedDate) {
      return true;
    }
    
    // Include articles from target date or within 1 day
    const pubDate = new Date(article.publishedDate);
    return pubDate >= dayBefore && pubDate <= dayAfter;
  });
}