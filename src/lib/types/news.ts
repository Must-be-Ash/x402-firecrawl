import { ObjectId } from 'mongodb';

export interface NewsArticle {
  headline: string;
  description: string;
  source: {
    name: string;
    url: string;
    favicon?: string;
  };
  publishedDate?: Date;
  summary: string; // From Firecrawl summary format
  imageUrl?: string;
  metadata: {
    firecrawlId: string;
    scrapedAt: Date;
    contentHash: string; // For deduplication
  };
}

export interface DailyNewsDocument {
  _id: ObjectId;
  date: string; // YYYY-MM-DD format
  timezone: string; // User's timezone when fetched
  articles: NewsArticle[];
  createdAt: Date;
  lastUpdated: Date;
  metadata: {
    totalArticles: number;
    searchQuery: string;
    firecrawlCost?: number; // Track API costs
    fetchDuration?: number; // Performance monitoring
  };
}

export interface NewsResponse {
  success: boolean;
  data: {
    date: string;
    articles: NewsArticle[];
    cached: boolean;
    totalCount: number;
  };
  error?: string | {
    code: ErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    retryAfter?: number;
  };
}

export enum ErrorCode {
  INVALID_DATE = 'INVALID_DATE',
  NO_DATA_FOUND = 'NO_DATA_FOUND',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  FIRECRAWL_ERROR = 'FIRECRAWL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}

// Firecrawl API response types
export interface FirecrawlSearchResponse {
  success: boolean;
  data: {
    web: FirecrawlWebResult[];
    images?: unknown[];
    news?: unknown[];
  };
  warning?: string;
}

export interface FirecrawlWebResult {
  title: string;
  description: string;
  url: string;
  markdown: string;
  html: string;
  rawHtml: string;
  summary: string;
  links: string[];
  screenshot?: string;
  metadata: {
    title: string;
    description: string;
    sourceURL: string;
    statusCode: number;
    error?: string;
    [key: string]: unknown;
  };
}