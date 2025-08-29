import { z } from 'zod';
import { validateDateFormat } from './date-utils';

// Date validation schema
export const dateSchema = z.string().refine(validateDateFormat, {
  message: 'Date must be in YYYY-MM-DD format'
});

// Timezone validation schema
export const timezoneSchema = z.string().refine((tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, {
  message: 'Invalid timezone identifier'
});

// News article validation
export const newsArticleSchema = z.object({
  headline: z.string().min(1, 'Headline is required'),
  description: z.string().min(1, 'Description is required'),
  source: z.object({
    name: z.string().min(1, 'Source name is required'),
    url: z.string().url('Source URL must be valid'),
    favicon: z.string().url().optional(),
  }),
  publishedDate: z.union([z.date(), z.string()]).optional(),
  summary: z.string().min(1, 'Summary is required'),
  imageUrl: z.string().url().optional(),
  metadata: z.object({
    firecrawlId: z.string().min(1, 'Firecrawl ID is required'),
    scrapedAt: z.date(),
    contentHash: z.string().min(1, 'Content hash is required'),
  }),
});

// API request validation schemas
export const newsRequestSchema = z.object({
  date: dateSchema.optional(),
  timezone: timezoneSchema.default('UTC'),
});

export const dateParamSchema = z.object({
  date: dateSchema,
});

// Validation helper functions
export function validateNewsRequest(data: unknown) {
  return newsRequestSchema.safeParse(data);
}

export function validateDateParam(data: unknown) {
  return dateParamSchema.safeParse(data);
}

export function validateNewsArticle(data: unknown) {
  return newsArticleSchema.safeParse(data);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
}

export function validateEnvironmentVariables(): boolean {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
}