import crypto from 'crypto';
import { NewsArticle, FirecrawlWebResult } from '@/lib/types/news';
import { sanitizeString } from './validators';

export function parseFirecrawlResponse(
  response: unknown
): NewsArticle[] {
  // Type guard to check if response has expected structure
  if (!response || typeof response !== 'object' || !('success' in response)) {
    console.log('DEBUG: Invalid response structure');
    return [];
  }

  const typedResponse = response as { 
    success: boolean; 
    data?: { 
      web?: unknown[]; 
      [key: string]: unknown; 
    } | Record<string, unknown>; 
  };
  if (!typedResponse.success) {
    console.log('DEBUG: Response success = false');
    return [];
  }

  let webResults: FirecrawlWebResult[] = [];

  // Handle regular Firecrawl format: data.web array
  const data = typedResponse.data;
  if (data && typeof data === 'object' && 'web' in data && Array.isArray((data as { web: unknown[] }).web)) {
    webResults = (data as { web: FirecrawlWebResult[] }).web;
    console.log('DEBUG: Using regular Firecrawl format with data.web array');
  }
  // Handle x402 format: indexed properties at root level
  else if (data || Object.keys(typedResponse).some(key => /^\d+$/.test(key))) {
    console.log('DEBUG: Detected x402 format, extracting indexed properties');
    const dataObj = data || typedResponse;
    
    // Extract numbered properties (0, 1, 2, etc.)
    for (let i = 0; i < 50; i++) { // Check up to 50 items
      if (dataObj && typeof dataObj === 'object') {
        const item = (dataObj as Record<string, unknown>)[i.toString()];
        if (item && typeof item === 'object') {
          // Convert x402 format to FirecrawlWebResult format
          const x402Item = item as Record<string, unknown>;
          const firecrawlItem: FirecrawlWebResult = {
            title: x402Item.title as string || '',
            description: x402Item.description as string || '',
            url: x402Item.url as string || '',
            markdown: '',
            html: '',
            rawHtml: '',
            summary: x402Item.description as string || '',
            links: [],
            metadata: {
              title: x402Item.title as string || '',
              description: x402Item.description as string || '',
              sourceURL: x402Item.url as string || '',
              statusCode: 200,
              ...(x402Item.metadata as Record<string, unknown> || {})
            }
          };
          webResults.push(firecrawlItem);
        } else {
          break; // Stop when we hit missing sequential numbers
        }
      } else {
        break;
      }
    }
    console.log(`DEBUG: Extracted ${webResults.length} items from x402 indexed format`);
  }

  if (webResults.length === 0) {
    console.log('DEBUG: No web results found in any format. Response structure:', Object.keys(typedResponse));
    return [];
  }

  const articles: NewsArticle[] = [];
  const seenHashes = new Set<string>();

  for (const item of webResults) {
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

  // Sort articles by source quality (prioritize legitimate news sources)
  const sortedArticles = articles.sort((a, b) => getSourceQualityScore(b.source.url) - getSourceQualityScore(a.source.url));

  console.log(`Parsed ${sortedArticles.length} unique articles from ${webResults.length} results`);
  
  // Debug: Log why articles might be getting filtered out
  if (webResults.length > 0 && articles.length === 0) {
    console.log('DEBUG: No articles parsed. Checking first web result for issues:');
    const firstItem = webResults[0];
    console.log({
      title: firstItem?.title ? `"${firstItem.title}"` : 'MISSING',
      url: firstItem?.url ? `"${firstItem.url}"` : 'MISSING', 
      summary: firstItem?.summary ? `"${firstItem.summary}"` : 'MISSING',
      description: firstItem?.description ? `"${firstItem.description}"` : 'MISSING',
      hasMetadata: !!firstItem?.metadata,
      metadataKeys: firstItem?.metadata ? Object.keys(firstItem.metadata) : 'no metadata',
      allKeys: Object.keys(firstItem || {})
    });
  }
  
  return sortedArticles;
}

function parseFirecrawlWebResult(item: FirecrawlWebResult): NewsArticle {
  // Handle both regular Firecrawl format and x402 format
  const title = item.title;
  const url = item.url;
  const summary = item.summary || item.description; // x402 uses 'description' instead of 'summary'
  const description = item.description;
  
  // Validate required fields
  if (!title || !url || !summary) {
    throw new Error(`Missing required fields: title=${!!title}, url=${!!url}, summary/description=${!!summary}`);
  }

  // Filter out news homepage/directory pages - we want specific articles
  if (isNewsHomepageOrDirectory(title, url, summary)) {
    throw new Error('Filtered out: appears to be homepage or directory rather than specific article');
  }

  // Filter out low-quality or non-news sources for important news (less aggressive now)
  if (isLowQualitySource(title, url, summary)) {
    console.log('DEBUG: Filtered low-quality source:', url);
    throw new Error('Filtered out: low-quality or non-primary news source');
  }

  // Extract source name from URL
  const sourceName = extractSourceName(url);
  
  // Find favicon URL
  const favicon = extractFavicon(item);
  
  // Parse published date if available
  const publishedDate = extractPublishedDate(item);
  
  // Find image URL
  const imageUrl = extractImageUrl(item);
  
  // Generate content hash for deduplication
  const contentHash = generateContentHash(title, summary, url);
  
  // Create unique Firecrawl ID
  const firecrawlId = (item.metadata?.scrapeId as string) || `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    headline: sanitizeString(title),
    description: sanitizeString(description || summary),
    source: {
      name: sourceName,
      url: url,
      favicon: favicon
    },
    publishedDate: publishedDate,
    summary: sanitizeString(summary),
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

function isNewsHomepageOrDirectory(title: string, url: string, summary: string): boolean {
  // Convert to lowercase for easier matching
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();
  const lowerSummary = summary.toLowerCase();
  
  // Only filter out very obvious non-news content
  const homepageIndicators = [
    // Only filter out very generic titles
    'home page',
    '404 not found',
    'page not found',

    // Only filter out obvious non-news URLs
    '://www.reddit.com/r/vancouver/',
  ];
  
  // Check against all indicators
  for (const indicator of homepageIndicators) {
    if (lowerTitle.includes(indicator) || lowerUrl.includes(indicator) || lowerSummary.includes(indicator)) {
      return true;
    }
  }
  
  // Only filter out very obvious homepage URLs
  if (lowerUrl.endsWith('.com/') && !lowerUrl.includes('/news') && !lowerUrl.includes('/article')) {
    return true;
  }
  
  // Check if title is too generic (likely a site name rather than article)
  // Be less aggressive - only filter out very obvious non-articles
  const genericTitlePatterns = [
    /^[a-z\s]+:\s*home$/i,
    /^home$/i,
  ];
  
  for (const pattern of genericTitlePatterns) {
    if (pattern.test(title)) {
      return true;
    }
  }
  
  return false;
}

function isLowQualitySource(title: string, url: string, summary: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Allow YouTube videos from legitimate news sources
  if (lowerUrl.includes('youtube.com/watch') || lowerUrl.includes('youtu.be/')) {
    // Check if it's from a legitimate news source based on title/description
    const legitimateNewsKeywords = [
      'cbc', 'ctv', 'global', 'bbc', 'cnn', 'reuters', 'abc', 'nbc',
      'national', 'news', 'headline', 'breaking'
    ];
    const contentToCheck = (lowerTitle + ' ' + summary.toLowerCase()).toLowerCase();
    const hasLegitimateSource = legitimateNewsKeywords.some(keyword =>
      contentToCheck.includes(keyword)
    );

    // Only filter out clearly non-news YouTube videos (e.g., entertainment, gaming, etc.)
    if (!hasLegitimateSource) {
      // Additional check: if it mentions dates like "Sept" or "September", it's likely news
      if (contentToCheck.includes('sept') || contentToCheck.includes('september') ||
          contentToCheck.includes('monday') || contentToCheck.includes('tuesday') ||
          contentToCheck.includes('2025')) {
        return false; // Keep it, likely news
      }
      return true; // Filter out
    }
  }
  
  // Filter out video/program pages that aren't articles (but allow legitimate news sources)
  const videoPatterns = [
    '/video/',
    '/watch/',
    '/player/',
    '/play/video/',
    'youtube.com',
    'youtu.be'
  ];
  
  // Only filter if it's clearly a video page AND not from a legitimate news source
  const isVideoPage = videoPatterns.some(pattern => lowerUrl.includes(pattern));
  const isLegitimateNewsSource = lowerUrl.includes('cbc.ca') || 
                                lowerUrl.includes('ctvnews.ca') || 
                                lowerUrl.includes('globalnews.ca') ||
                                lowerUrl.includes('reuters.com') ||
                                lowerUrl.includes('bbc.com') ||
                                lowerUrl.includes('cnn.com');
  
  if (isVideoPage && !isLegitimateNewsSource) {
    return true;
  }
  
  // Filter out obvious social media sources
  const socialMediaSources = [
    'reddit.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
  ];
  
  for (const source of socialMediaSources) {
    if (lowerUrl.includes(source)) {
      return true;
    }
  }
  
  // Filter out generic video content indicators
  const videoIndicators = [
    'watch online',
    'video online',
    'duration live',
  ];
  
  for (const indicator of videoIndicators) {
    if (lowerTitle.includes(indicator) || summary.toLowerCase().includes(indicator)) {
      return true;
    }
  }
  
  // Filter out shopping/sales content that isn't news
  const shoppingIndicators = [
    'best labour day sales',
    'weekend sales to shop',
    'amazing deals',
    'shopping deals',
    'black friday',
    'cyber monday',
    'sales canada',
    'retailers and',
  ];
  
  for (const indicator of shoppingIndicators) {
    if (lowerTitle.includes(indicator) || summary.toLowerCase().includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

function getSourceQualityScore(url: string): number {
  const lowerUrl = url.toLowerCase();
  
  // Tier 1: Major Canadian news outlets (highest priority)
  const tier1Sources = [
    'cbc.ca',
    'ctvnews.ca', 
    'globalnews.ca',
    'cp24.com',
    'theglobeandmail.com',
    'nationalpost.com',
  ];
  
  // Tier 2: Regional Canadian news outlets
  const tier2Sources = [
    'vancouversun.com',
    'theprovince.com',
    'vancouverisawesome.com',
    'dailyhive.com',
    'richmond-news.com',
    'burnabynow.com',
    'nsnews.com',
  ];
  
  // Tier 3: International major news (still good quality)
  const tier3Sources = [
    'reuters.com',
    'ap.org',
    'bbc.com',
    'bbc.co.uk',
    'cnn.com',
    'nytimes.com',
  ];
  
  // Check source tiers
  for (const source of tier1Sources) {
    if (lowerUrl.includes(source)) {
      return 100; // Highest priority
    }
  }
  
  for (const source of tier2Sources) {
    if (lowerUrl.includes(source)) {
      return 80; // High priority
    }
  }
  
  for (const source of tier3Sources) {
    if (lowerUrl.includes(source)) {
      return 60; // Medium priority
    }
  }
  
  // Lower priority for other sources
  return 20;
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