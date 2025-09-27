# Dormant News Website - x402 Proof of Concept

A location-aware news aggregator that **only activates when visited**, demonstrating zero idle costs through x402 micropayments. The system detects visitor location, triggers pay-per-use Firecrawl API calls via x402, caches results, and incurs costs only during actual usage.

**Live Demo Concept**: When a Dublin visitor arrives → x402 payment triggers → Firecrawl scrapes Ireland news → cached for next visitor → no ongoing costs.

## Key Technologies

- **[x402 Protocol](https://www.x402.org/)**: HTTP-native micropayments enabling pay-per-use APIs
- **[Firecrawl v2](https://www.firecrawl.dev/)**: Web scraping API with x402 payment support (using news-focused search)
- **[Coinbase Developer Platform](https://docs.cdp.coinbase.com/)**: Wallet and USDC payments on Base
- **Next.js 15 + MongoDB**: Full-stack framework with intelligent caching

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- x402 wallet with USDC on Base (mainnet)

### Installation

```bash
# Clone and install
git clone <your-repo>
cd news-app
npm install

# Setup environment
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/news-app
MONGODB_DB_NAME=news-app

# x402 Payment (get from Coinbase Developer Platform)
X402_PRIVATE_KEY=0x1234...your_private_key
# Fund wallet with USDC on Base: https://portal.cdp.coinbase.com/products/faucet

# Firecrawl API
FIRECRAWL_API_BASE_URL=https://api.firecrawl.dev/v2/x402/search
FIRECRAWL_API_KEY=fc-...your_api_key
# Get key at: https://www.firecrawl.dev/
```

### Run Development Server

```bash
npm run dev
# Visit http://localhost:3000
```

### Test Different Locations

```bash
# Test location-based caching via CLI
npx tsx src/scripts/test-location.ts "Europe/Dublin"
npx tsx src/scripts/test-location.ts --all

# Test in browser with timezone override
http://localhost:3000/?timezone=Europe/Dublin
http://localhost:3000/?timezone=America/New_York
http://localhost:3000/?timezone=Asia/Tokyo

# Clear cache
npx tsx src/scripts/clear-cache.ts --all
```

## Architecture Overview

### How It Works

```
1. Visitor arrives → Browser detects timezone (e.g., "Europe/Dublin")
2. System checks cache → MongoDB: (date=2025-09-26, timezone=Europe/Dublin, location=IE-Dublin)
3. Cache miss → Trigger x402 payment to Firecrawl API
4. Firecrawl scrapes Ireland news → System caches results
5. Next Dublin visitor → Cache hit → No API call → No cost
```

### Core Flow: Visitor → Location Detection → x402 Payment → Cache

```
┌─────────────┐
│   Visitor   │ Browser timezone: Europe/Dublin
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  page.tsx (Frontend Entry Point)               │
│  • Detects timezone via Intl API               │
│  • Initializes NewsProvider with detected TZ   │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  news-context.tsx (State Management)            │
│  • Manages selected date and timezone          │
│  • Calls fetchNews() when date changes         │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  api/news/route.ts (API Endpoint)               │
│  GET /api/news?date=2025-09-26&timezone=...    │
│  • Receives request from frontend              │
│  • Calls newsService.getNewsByDateString()     │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  newsService.ts (Business Logic)                │
│  1. Extract location from timezone              │
│     Europe/Dublin → IE-Dublin                   │
│  2. Check MongoDB cache                         │
│     Query: (date, timezone, location)           │
│  3. Cache miss → fetchFreshNews()               │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  x402Service.ts (Payment & API Call)            │
│  1. Generate location query                     │
│     "Dublin, Ireland breaking news today"       │
│  2. Create x402 payment via viem                │
│     • Sign EIP-712 USDC authorization          │
│     • Create payment header                     │
│  3. Call Firecrawl with X-PAYMENT header        │
│  4. Return scraped news articles                │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  MongoDB Cache (Cost Optimization)              │
│  • Save: (date, timezone, location, articles)   │
│  • Index: {date, timezone, location}            │
│  • Next visitor from Dublin → Cache hit!        │
└─────────────────────────────────────────────────┘
```

### Key Files & Responsibilities

| File | Purpose |
|------|---------|
| **`src/app/page.tsx`** | Frontend entry point, detects browser timezone, initializes app state |
| **`src/lib/context/news-context.tsx`** | React Context managing date/timezone state, triggers API calls |
| **`src/app/api/news/route.ts`** | API endpoint receiving requests from frontend |
| **`src/lib/services/newsService.ts`** | Business logic: cache checking, location extraction, orchestrates fetching |
| **`src/lib/services/x402Service.ts`** | x402 payment creation, Firecrawl API calls with micropayments |
| **`src/lib/utils/date-utils.ts`** | **Dynamic location extraction** from IANA timezones (no hardcoded cities!) |
| **`src/lib/db/operations/newsOperations.ts`** | MongoDB operations: save/retrieve cached news by location |

### Location Detection (Fully Dynamic)

The system **never hardcodes locations**—it dynamically parses IANA timezones:

```typescript
// date-utils.ts
"Europe/Dublin"       → Country: IE, City: Dublin, Query: "Dublin, Ireland"
"America/New_York"    → Country: US, City: New York, Query: "New York, United States"
"Asia/Tokyo"          → Country: JP, City: Tokyo, Query: "Tokyo, Japan"
"Australia/Sydney"    → Country: AU, City: Sydney, Query: "Sydney, Australia"

// Works for ANY timezone worldwide!
```

### x402 Payment Flow

```typescript
// x402Service.ts - Firecrawl v2 with news sources

1. Initial Request to Firecrawl v2
   → Body: { query, limit: 30, sources: ["news"] }
   → Response: 402 Payment Required
   → Payment requirements: { amount, payTo, asset, network }

2. Create EIP-712 Signature (USDC authorization)
   → Sign transferWithAuthorization message
   → Creates permission for Firecrawl to pull funds

3. Encode Payment Header
   → Base64 encode signature + authorization
   → Add X-PAYMENT header to request

4. Retry Request with Payment
   → Firecrawl verifies signature
   → Settles payment on Base blockchain
   → Returns news-focused search results
   → Response format: { success: true, data: { news: [...], web: [...] } }
```

### Cache Strategy (Cost Optimization)

```javascript
// MongoDB document structure
{
  date: "2025-09-26",
  timezone: "Europe/Dublin",
  location: "IE-Dublin",          // Location identifier
  articles: [...],                // Cached news articles
  metadata: {
    searchQuery: "Dublin, Ireland breaking news today",
    country: "IE",
    fetchedAt: "2025-09-26T10:00:00Z"
  }
}

// Index for fast lookups
{ date: 1, timezone: 1, location: 1 }
```

**Key Insight**: Cache by `(date, timezone, location)` tuple ensures:
- Dublin visitors see Dublin news (not Vancouver news)
- Cached results reused for same location
- Only pays Firecrawl once per location per day

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Frontend: timezone detection, NewsProvider init
│   └── api/news/route.ts           # API endpoint: /api/news handler
├── components/
│   ├── news/
│   │   ├── news-feed.tsx           # Main news display component
│   │   ├── news-grid.tsx           # Article grid layout
│   │   └── news-card.tsx           # Individual article card
│   └── ui/
│       ├── calendar.tsx            # Date picker with cache indicators
│       └── optimized-calendar.tsx  # Performance-optimized calendar
├── lib/
│   ├── context/
│   │   └── news-context.tsx        # React Context: date/timezone state
│   ├── services/
│   │   ├── newsService.ts          # Business logic: cache + fetch orchestration
│   │   └── x402Service.ts          # x402 payments + Firecrawl API calls
│   ├── db/
│   │   ├── mongodb.ts              # Database connection + indexes
│   │   └── operations/
│   │       └── newsOperations.ts   # MongoDB CRUD for cached news
│   └── utils/
│       ├── date-utils.ts           # 🌟 Dynamic location extraction from timezones
│       └── news-parser.ts          # Parse/filter Firecrawl responses
├── scripts/
│   ├── test-location.ts            # CLI: test different locations
│   └── clear-cache.ts              # CLI: manage MongoDB cache
└── config/
    └── x402.ts                     # x402 configuration
```

## Cost Model: Dormant → Active → Dormant

**Traditional News Site**:
- 24/7 scheduled scraping: $X per hour × 24 × 30 = $720/month (even with zero visitors)

**x402 Dormant Model**:
- Idle state: $0/month
- Visitor arrives: ~$0.001 Firecrawl call (one-time)
- 1000 visitors, 100 unique locations: ~$0.10/month
- **Only pay for actual usage**

## Development Scripts

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # ESLint
npm run type-check       # TypeScript validation

# Testing & Cache Management
npx tsx src/scripts/test-location.ts "Europe/Dublin"
npx tsx src/scripts/test-location.ts --all
npx tsx src/scripts/clear-cache.ts --all
```

## How Different Locations Work

```bash
# Dublin visitor
http://localhost:3000/?timezone=Europe/Dublin
→ Fetches: "Dublin, Ireland breaking news"
→ Caches: IE-Dublin
→ Shows: Irish news sources (BBC Northern Ireland, Irish Times, etc.)

# New York visitor
http://localhost:3000/?timezone=America/New_York
→ Fetches: "New York, United States breaking news"
→ Caches: US-NewYork
→ Shows: US news sources (NY Times, CNN, etc.)

# Tokyo visitor
http://localhost:3000/?timezone=Asia/Tokyo
→ Fetches: "Tokyo, Japan breaking news"
→ Caches: JP-Tokyo
→ Shows: Japanese news sources
```

## Firecrawl v2 Integration

This app uses Firecrawl v2 with news-focused search for better results:

**Key Features**:
- **`sources: ["news"]`** parameter for news-specific results from real news sites
- **Response format**: `{ success: true, data: { news: [...], web: [...], images: [...] } }`
- **Simplified requests**: No need for `origin`, `categories`, or `parsers` in basic calls
- **News metadata**: Each result includes `title`, `url`, `snippet`, `date`, and `imageUrl`

**Comparison**:
- v1 with `web` sources → Generic web results (blogs, forums, etc.)
- v2 with `news` sources → Curated news from legitimate news outlets (NY Times, BBC, Reuters, etc.)

## Proof of Concept Insights

This demonstrates how x402 enables:

1. **Zero Idle Costs**: No scheduled jobs, no wasted API calls
2. **Visitor-Triggered Payments**: Infrastructure activates on-demand
3. **Global Scalability**: Works for any location automatically
4. **Intelligent Caching**: Subsequent visitors reuse cached data
5. **Transparent Micropayments**: Sub-cent API costs with blockchain settlement
6. **Quality News Sources**: Firecrawl v2 with `news` sources provides curated, high-quality results

Traditional APIs require subscriptions even during idle time. x402 enables pay-per-use consumption, making dormant infrastructure economically viable.

## License

MIT# x402-firecrawl
