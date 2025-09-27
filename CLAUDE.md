# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A location-aware news aggregator demonstrating the x402 payment protocol for pay-per-use API calls. The application detects visitor location (via timezone), triggers micropayments to Firecrawl API only when needed, and caches results to minimize costs. This creates a "dormant" application that incurs zero costs when idle.

## Core Architecture

### Request Flow
```
Browser → Detect Timezone → API Route → Check MongoDB Cache
   ↓ (Cache Miss)
newsService → x402Service → Sign EIP-712 Payment → Firecrawl API
   ↓
Parse Response → Save to MongoDB → Return to Frontend
```

### Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Frontend entry: detects browser timezone via `Intl.DateTimeFormat` |
| `src/lib/context/news-context.tsx` | React Context managing date/timezone state, triggers API calls |
| `src/app/api/news/route.ts` | API endpoint: `GET /api/news?date=YYYY-MM-DD&timezone=...` |
| `src/lib/services/newsService.ts` | Business logic: cache checking, location extraction, orchestration |
| `src/lib/services/x402Service.ts` | x402 payment creation (EIP-712 signatures), Firecrawl API calls |
| `src/lib/utils/date-utils.ts` | **Dynamic location extraction** from IANA timezones (e.g., `Europe/Dublin` → `IE-Dublin`) |
| `src/lib/db/operations/newsOperations.ts` | MongoDB operations: save/retrieve cached news by `(date, timezone, location)` |
| `src/config/x402.ts` | x402 configuration (networks, endpoints, payment limits) |

### x402 Payment Flow

The application implements the x402 protocol for micropayments:

1. **Initial request** to Firecrawl returns `402 Payment Required` with payment requirements
2. **Create EIP-712 signature** for USDC `transferWithAuthorization` message using `viem`
3. **Encode payment header** as base64 JSON payload with signature + authorization
4. **Retry request** with `X-PAYMENT` header → Firecrawl verifies → settles on Base → returns data

Two payment approaches (fallback pattern):
- **Primary**: `x402-fetch` library (automatic payment handling via `wrapFetchWithPayment`)
- **Fallback**: Manual EIP-712 signing following x402 standards (see `makePaymentRequestX402Standard`)

### Location Detection (Fully Dynamic)

The system **never hardcodes locations**—it dynamically parses IANA timezones in `date-utils.ts`:
- `Europe/Dublin` → Country: `IE`, City: `Dublin`, Query: `"Dublin, Ireland breaking news today"`
- `America/New_York` → Country: `US`, City: `New York`, Query: `"New York, United States breaking news today"`
- Works for **any** timezone worldwide

### Cache Strategy

MongoDB stores news by composite key: `{ date, timezone, location }`

```javascript
{
  date: "2025-09-26",
  timezone: "Europe/Dublin",
  location: "IE-Dublin",
  articles: [...],
  metadata: {
    searchQuery: "Dublin, Ireland breaking news today",
    country: "IE",
    fetchedAt: "2025-09-26T10:00:00Z"
  }
}
```

**Key insight**: Dublin visitors see Dublin news (not cached Vancouver news). Subsequent visitors from same location hit cache → zero API costs.

## Development Commands

```bash
# Development
npm run dev           # Start dev server with Turbopack (http://localhost:3000)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run type-check    # TypeScript validation (tsc --noEmit)

# Database
npm run db:setup      # Setup MongoDB indexes and initial data

# Testing
npm run clean         # Remove .next and out directories
npm run preview       # Build + start production preview

# CLI Utilities (via tsx)
npx tsx src/scripts/test-location.ts "Europe/Dublin"
npx tsx src/scripts/test-location.ts --all
npx tsx src/scripts/clear-cache.ts --all
```

## Environment Variables

Required variables in `.env.local`:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/news-app
MONGODB_DB_NAME=news-app

# x402 Payment (admin wallet pays for API calls)
X402_PRIVATE_KEY=0x...your_private_key
FIRECRAWL_API_BASE_URL=https://api.firecrawl.dev/v1/x402/search
FIRECRAWL_API_KEY=fc-...your_api_key
FIRECRAWL_NETWORK=base  # Firecrawl requires mainnet USDC (base or base-sepolia)

# Optional: CDP Facilitator
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret
```

**Important**:
- Use `.env.example` as template
- Never commit `.env.local` (contains secrets)
- Fund wallet with USDC on Base: https://portal.cdp.coinbase.com/products/faucet
- **402 response is expected and correct** (not an error!)—it triggers payment flow
- Wallet `0xAbF01df9428EaD5418473A7c91244826A3Af23b3` has ETH + USDC for testing

## Testing Different Locations

```bash
# Browser (timezone override)
http://localhost:3000/?timezone=Europe/Dublin
http://localhost:3000/?timezone=America/New_York
http://localhost:3000/?timezone=Asia/Tokyo

# CLI testing
npx tsx src/scripts/test-location.ts "Europe/Dublin"
```

## x402 Protocol Notes

**When experiencing x402 errors or 402 response issues**:
- Use context7 MCP to study official x402 documentation
- A 402 response is **not an error**—it's the protocol working correctly
- Check if you obtained the news summary data after the 402 response
- Successful 402 flow: `402 Payment Required` → Sign → Retry with `X-PAYMENT` header → `200 OK`

**Payment debugging**:
- Circuit breaker prevents rapid failed attempts (3 failures = 60s cooldown)
- Reset via `GET /api/reset-circuit` endpoint
- Check wallet balance: `GET /api/wallet`
- View payment flow logs in x402Service.ts console output

**Network configuration**:
- Use Base (mainnet) for Firecrawl (requires real USDC)
- Test network: `base-sepolia` (for non-Firecrawl testing)

## TypeScript Configuration

- Path alias: `@/*` maps to `./src/*`
- Target: ES2017 (for modern async/await support)
- Strict mode enabled
- Next.js plugin for type generation

## Common Development Tasks

### Adding New Location Support
1. No code changes needed—dynamic parsing in `date-utils.ts` handles all IANA timezones
2. Test new timezone: `npx tsx src/scripts/test-location.ts "Your/Timezone"`

### Debugging Payment Issues
1. Check wallet balance: `scripts/check-balance.js`
2. Review payment flow: Console logs in `x402Service.ts` show signature creation, header encoding
3. Test Firecrawl connection: `GET /api/health`
4. If 402 errors persist: Check context7 MCP for x402 protocol details

### Managing Cache
- Clear all cache: `npx tsx src/scripts/clear-cache.ts --all`
- View cache status: MongoDB query or `GET /api/debug-db`
- Cache invalidation: Delete specific `(date, timezone, location)` tuples

### Working with MongoDB
- Connection: `src/lib/db/mongodb.ts` (singleton pattern with indexes)
- Operations: `src/lib/db/operations/newsOperations.ts`
- Test connection: `GET /api/health` or `npx tsx src/lib/db/test-connection.ts`