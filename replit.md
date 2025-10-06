# Overview

A location-aware news aggregator that demonstrates the x402 micropayment protocol for pay-per-use API calls. The application automatically detects visitor location from their browser timezone, triggers micropayments to the Firecrawl API only when needed, and caches results to minimize costs. Built with Next.js 15, MongoDB, and the x402 protocol on Base network.

**Core Concept**: A "dormant" website that only activates (and spends money) when visitors arrive. When a Dublin visitor accesses the site → x402 payment triggers → Firecrawl scrapes Ireland news → cached for next visitor → zero idle costs.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Request Flow Architecture

**Browser → Timezone Detection → API Route → Cache Check → Payment → Data Fetch → Cache → Response**

1. **Frontend Detection**: Browser automatically detects user timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
2. **Location Extraction**: IANA timezone (e.g., "Europe/Dublin") dynamically parsed to extract location identifier ("IE-Dublin") and search query ("Dublin, Ireland")
3. **Cache-First Strategy**: MongoDB checked for existing news by `(date, timezone, location)` composite key
4. **Micropayment Trigger**: On cache miss, x402 payment flow initiates for Firecrawl API call
5. **Payment Flow**: EIP-712 USDC authorization signature → x402 header → Firecrawl validates → settles on Base → returns news
6. **Data Persistence**: Results cached with location metadata to prevent duplicate API costs

## Core Components

### Payment System (x402 Protocol)
- **Primary Approach**: `x402-fetch` library with `wrapFetchWithPayment` for automatic payment handling
- **Fallback Pattern**: Manual EIP-712 signing following x402 standards (transferWithAuthorization)
- **Payment Authorization**: USDC on Base network with signature-based authorization (no gas fees for user)
- **Network**: Base mainnet (chainId: 8453) for production Firecrawl calls
- **Security**: Private key stored in env vars, signatures generated server-side only

### Location Detection Strategy
- **Dynamic Parsing**: Extracts location from IANA timezone format (no hardcoded city mappings)
- **Algorithm**: `America/New_York` → Country: "US", City: "NewYork", Query: "New York, United States"
- **Cache Key**: Uses location identifier format (e.g., "CA-Vancouver", "GB-London") to prevent timezone collision
- **URL Override**: Supports `?timezone=<IANA_TIMEZONE>` query parameter for testing different locations

### Data Layer (MongoDB)
- **Collection**: `daily_news` with composite indexes on `(date, timezone, location)`
- **Deduplication**: Content hash-based article deduplication within same date/location
- **Caching Strategy**: 24-hour cache duration, automatic cleanup of expired entries
- **Schema**: Stores articles with metadata (search query, API costs, fetch duration) for analytics

### API Architecture
- **Main Endpoint**: `GET /api/news?date=YYYY-MM-DD&timezone=<IANA>` returns cached or fresh news
- **Health Check**: `/api/health` validates MongoDB, news service, optional Firecrawl connectivity
- **Development Tools**: `/api/clear-db`, `/api/debug-db`, `/api/wallet` for debugging (dev-only)

### News Parsing & Quality
- **Source Priority**: Firecrawl v2 `sources: ["news"]` parameter for news-focused results
- **Relevance Filtering**: Removes generic headlines, duplicate content, and low-quality sources
- **Data Enrichment**: Extracts favicon, published date, image URLs from search results
- **Response Format**: Firecrawl v2 returns `{ success: true, data: { news: [...], web: [...] } }`

## Frontend Architecture

### State Management (React Context)
- **NewsProvider**: Centralized state for articles, loading status, error handling
- **Date Context**: Manages selected date, available dates, date validation
- **Error Context**: Retry logic, error codes, user-friendly error messages
- **Cache Service**: Client-side localStorage caching with TTL management

### Component Structure
- **Page Component** (`app/page.tsx`): Timezone detection, date initialization, NewsFeed orchestration
- **NewsFeed**: Coordinates data fetching, calendar, and news grid display
- **NewsGrid**: Responsive article layout with loading skeletons
- **Calendar**: Date selection with visual indicators for cached dates
- **NewsCard**: Individual article display with source attribution

### Performance Optimizations
- **Debouncing**: Date selection debounced (300ms) to prevent excessive API calls
- **Prefetching**: Nearby dates preloaded when user navigates calendar
- **Skeleton Loading**: Immediate UI feedback during data fetch
- **Error Boundaries**: Granular error handling prevents full-page crashes

## Design Patterns

### Circuit Breaker (x402 Service)
- **State Tracking**: Monitors consecutive failures to prevent cascade failures
- **Threshold**: 3 consecutive failures triggers open state
- **Recovery**: 60-second cooldown before allowing retry attempts
- **Fallback**: Returns cached data or graceful error when circuit open

### Fallback Strategy
- **Primary**: x402-fetch library (automatic payment + retry logic)
- **Secondary**: Manual EIP-712 signing (explicit x402 standard compliance)
- **Reasoning**: Library convenience with manual fallback for debugging/control

### Cache Invalidation
- **TTL-Based**: 24-hour expiration for news data freshness
- **LRU Eviction**: Client-side cache limited to 50 entries (oldest removed first)
- **Composite Keys**: `date_timezone_location` prevents incorrect data serving across locations

# External Dependencies

## Payment & Blockchain
- **x402 Protocol**: HTTP-native micropayment standard for API monetization
- **x402-fetch Library** (`^0.5.1`): Automatic payment wrapper for fetch API
- **@coinbase/x402** (`^0.5.1`): x402 utilities and helpers
- **viem** (`^2.36.0`): Ethereum library for wallet operations, EIP-712 signing
- **Base Network**: Layer 2 for USDC settlement (low fees, fast confirmation)

## APIs & Services
- **Firecrawl API** (`v2/x402/search`): Web scraping with x402 payment support
  - Endpoint: `https://api.firecrawl.dev/v2/x402/search`
  - Features: News-focused search (`sources: ["news"]`), content extraction
  - Payment: USDC on Base via x402 protocol
- **MongoDB** (`^6.19.0`): Document database for news caching and persistence
  - Connection: MongoDB Atlas or local instance
  - Schema: Flexible document model for articles + metadata

## Development Tools
- **Coinbase Developer Platform**: x402 wallet management, USDC faucet for testnet
- **Next.js** (`15.5.2`): React framework with App Router, API routes, RSC support
- **TypeScript** (`^5`): Type safety across frontend/backend
- **Tailwind CSS** (`^4`): Utility-first styling with @tailwindcss/postcss
- **date-fns** (`^4.1.0`): Date manipulation and timezone handling

## Configuration Requirements
- **Environment Variables**:
  - `MONGODB_URI`: MongoDB connection string (Atlas or local)
  - `MONGODB_DB_NAME`: MongoDB database name
  - `X402_PRIVATE_KEY`: Wallet private key for signing payments (funded with USDC on Base)
  - `FIRECRAWL_API_KEY`: Firecrawl API authentication key
  - `FIRECRAWL_NETWORK`: Network for Firecrawl (always "base" for mainnet)
  - Optional: `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` for advanced wallet features

# Replit Deployment

## Migration from Vercel
Successfully migrated from Vercel to Replit with minimal changes:

1. **Port Configuration**: Updated `package.json` scripts to bind to `0.0.0.0:5000` (Replit requirement)
   - Development: `next dev --hostname 0.0.0.0 --port 5000`
   - Production: `next start --hostname 0.0.0.0 --port 5000`

2. **Turbopack Disabled**: Removed `--turbopack` flag to prevent bus errors on Replit

3. **Original Stack Preserved**: 
   - Next.js 15.5.2
   - React 19.1.0
   - Tailwind CSS v4
   - TypeScript config (next.config.ts)

4. **Deployment Config**: Configured autoscale deployment with build/start commands

5. **All secrets configured in Replit Secrets Manager**