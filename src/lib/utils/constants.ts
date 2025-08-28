// API endpoints
export const API_ROUTES = {
  NEWS: '/api/news',
  NEWS_BY_DATE: '/api/news',
  HEALTH: '/api/health',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_DATE: 'Invalid date format. Please use YYYY-MM-DD.',
  FUTURE_DATE: 'Cannot fetch news for future dates.',
  OLD_DATE: 'News data not available for dates older than 1 year.',
  NO_DATA: 'No news data found for the specified date.',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  API_ERROR: 'Failed to fetch news. Please try again.',
  DATABASE_ERROR: 'Database error occurred.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  NEWS_FETCHED: 'News fetched successfully',
  NEWS_CACHED: 'News loaded from cache',
} as const;

// App configuration
export const APP_CONFIG = {
  NAME: 'Daily News',
  DESCRIPTION: 'Your daily news aggregator',
  MAX_ARTICLES_PER_DAY: 50,
  CACHE_DURATION_DAYS: 90,
  MAX_SUMMARY_LENGTH: 200,
  MAX_HEADLINE_LENGTH: 150,
  DEFAULT_TIMEZONE: 'UTC',
} as const;

// UI configuration
export const UI_CONFIG = {
  LOADING_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  ANIMATION_DURATION: 300,
  SKELETON_ROWS: 6,
} as const;

// Date configuration
export const DATE_CONFIG = {
  FORMAT_API: 'yyyy-MM-dd',
  FORMAT_DISPLAY: 'MMMM d, yyyy',
  FORMAT_SHORT: 'MMM d',
  MAX_HISTORY_DAYS: 365,
} as const;

// Payment configuration
export const PAYMENT_CONFIG = {
  MAX_AMOUNT_USDC: 0.1,
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;