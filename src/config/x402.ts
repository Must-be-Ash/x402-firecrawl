export const x402Config = {
  // Firecrawl API endpoint
  firecrawlEndpoint: process.env.FIRECRAWL_API_BASE_URL || 'https://api.firecrawl.dev/v1/x402/search',
  
  // Payment configuration
  payment: {
    privateKey: process.env.X402_PRIVATE_KEY,
    maxPaymentAmount: BigInt(process.env.NEXT_PUBLIC_MAX_PAYMENT_AMOUNT || '100000'), // 0.1 USDC in wei
    network: process.env.NODE_ENV === 'production' ? 'base' : 'base-sepolia', // General network for non-Firecrawl calls
    firecrawlNetwork: process.env.FIRECRAWL_NETWORK || 'base', // Specific network for Firecrawl (always mainnet)
    facilitator: {
      url: 'https://facilitator.404.org', // Fallback facilitator
    },
  },
  
  // CDP configuration (optional)
  cdp: {
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
  },
  
  // Rate limiting
  rateLimit: {
    maxRequestsPerDay: parseInt(process.env.RATE_LIMIT_PER_DAY || '100', 10),
    maxDailyCost: parseFloat(process.env.MAX_DAILY_COST || '10'),
  },
  
  // Firecrawl search configuration
  search: {
    defaultOptions: {
      sources: ['web'],
      limit: 20,
      scrapeOptions: {
        onlyMainContent: true,
        maxAge: 172800000, // 2 days
        formats: ['summary']
      }
    },
  },
} as const;

export const getX402Config = () => x402Config;