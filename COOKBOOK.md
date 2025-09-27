# News App Cookbook

Common recipes and patterns for working with this x402-powered news aggregator.

## Table of Contents
- [Setup & Installation](#setup--installation)
- [Testing & Debugging](#testing--debugging)
- [Working with Payments](#working-with-payments)
- [Cache Management](#cache-management)
- [Location & Timezone](#location--timezone)
- [Database Operations](#database-operations)
- [Troubleshooting](#troubleshooting)

---

## Setup & Installation

### First-Time Setup

```bash
# Clone and install dependencies
git clone <your-repo>
cd news-app
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your actual credentials

# Setup database indexes
npm run db:setup

# Start development server
npm run dev
```

### Get Required Credentials

**MongoDB URI:**
```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/news-app

# MongoDB Atlas (free tier)
# 1. Create cluster at https://www.mongodb.com/cloud/atlas
# 2. Get connection string from "Connect" → "Connect your application"
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

**x402 Private Key:**
```bash
# Option 1: Generate new wallet with Foundry
cast wallet new

# Option 2: Use Coinbase Developer Platform
# https://portal.cdp.coinbase.com/

# Fund with USDC on Base mainnet
# https://portal.cdp.coinbase.com/products/faucet
```

**Firecrawl API Key:**
```bash
# Sign up at https://www.firecrawl.dev/
# Generate API key from dashboard
FIRECRAWL_API_KEY=fc-...your_key
FIRECRAWL_API_BASE_URL=https://api.firecrawl.dev/v2/x402/search

# v2 API uses news-focused search for better results
```

---

## Testing & Debugging

### Test Different Locations

**Browser Testing:**
```bash
# Override timezone in browser
http://localhost:3000/?timezone=Europe/Dublin
http://localhost:3000/?timezone=America/New_York
http://localhost:3000/?timezone=Asia/Tokyo
http://localhost:3000/?timezone=Australia/Sydney
```

**CLI Testing:**
```bash
# Test single location
npx tsx src/scripts/test-location.ts "Europe/Dublin"

# Test all major timezones
npx tsx src/scripts/test-location.ts --all

# Test specific date
npx tsx src/scripts/test-location.ts "America/New_York" "2025-09-26"
```

### Check System Health

**Via API:**
```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Wallet balance
curl http://localhost:3000/api/wallet

# Database status
curl http://localhost:3000/api/debug-db
```

**Via Scripts:**
```bash
# Check wallet balance
node scripts/check-balance.js

# Test database connection
npx tsx src/lib/db/test-connection.ts

# Debug database status
node scripts/debug-database-status.js
```

### View Logs

```bash
# Watch server logs during development
npm run dev

# Look for these key indicators:
# ✅ "Found cached news for..." → Cache hit
# ✅ "Payment successful! Got news data" → x402 payment worked
# ⚠️  "Expected 402 Payment Required" → Start of payment flow (normal!)
# ❌ "Payment failed" → Check wallet balance and network
```

---

## Working with Payments

### Understanding x402 Flow

```bash
# Normal successful flow (Firecrawl v2):
1. Request to Firecrawl v2 with sources:["news"] → 402 Payment Required (THIS IS CORRECT!)
2. Create EIP-712 signature → Sign payment authorization
3. Retry with X-PAYMENT header → 200 OK with news data
4. Response: { success: true, data: { news: [...], web: [...] } }

# What 402 means:
- NOT an error!
- Triggers payment creation
- Expected behavior in x402 protocol

# v2 Improvements:
- Uses sources:["news"] for better quality news results
- Simpler request structure
- News-specific response format
```

### Check Wallet Balance

```bash
# Via API
curl http://localhost:3000/api/wallet

# Via script
node scripts/check-balance.js

# Output shows:
# - ETH balance (for gas)
# - USDC balance (for payments)
# - Address
```

### Reset Circuit Breaker

```bash
# If you hit rate limits (3 failures = 60s cooldown)
curl http://localhost:3000/api/reset-circuit

# Or restart the dev server
npm run dev
```

### Debug Payment Issues

```bash
# 1. Check environment variables
node scripts/debug-env.js

# 2. Verify signature creation
node scripts/debug-signature.js

# 3. Test payment flow
node scripts/debug-x402-flow.js

# 4. Check USDC contract details
node scripts/debug-usdc-details.js

# 5. View payment timing
node scripts/debug-timing-issue.js
```

### Fund Your Wallet

```bash
# Base Sepolia (testnet)
# https://portal.cdp.coinbase.com/products/faucet

# Base Mainnet (required for Firecrawl)
# 1. Bridge USDC to Base: https://bridge.base.org/
# 2. Or buy on Coinbase and transfer to Base
# 3. Send ETH for gas (small amount)

# Verify receipt
node scripts/check-balance.js
```

---

## Cache Management

### Clear Cache

```bash
# Clear all cached news
npx tsx src/scripts/clear-cache.ts --all

# Clear specific date
npx tsx src/scripts/clear-cache.ts --date "2025-09-26"

# Clear specific location
npx tsx src/scripts/clear-cache.ts --location "IE-Dublin"

# Via API
curl -X POST http://localhost:3000/api/clear-db
```

### View Cache Contents

```bash
# Via API
curl http://localhost:3000/api/debug-db

# Via MongoDB shell
mongosh
use news-app
db.news.find().pretty()

# Count cached entries
db.news.countDocuments()

# Find specific date/location
db.news.find({ date: "2025-09-26", location: "IE-Dublin" })
```

### Cache Strategy

```javascript
// Cache key structure
{
  date: "YYYY-MM-DD",      // Date of news
  timezone: "Europe/Dublin", // Original timezone
  location: "IE-Dublin"     // Computed location identifier
}

// When cache is used:
// ✅ Same date + same location → Cache hit
// ❌ Same date + different location → Cache miss (fetch new)
// ❌ Different date + same location → Cache miss (fetch new)
```

### Preload Cache for Common Locations

```bash
# Create a preload script
cat > scripts/preload-cache.sh << 'EOF'
#!/bin/bash
LOCATIONS=(
  "America/New_York"
  "America/Los_Angeles"
  "Europe/London"
  "Europe/Dublin"
  "Asia/Tokyo"
  "Australia/Sydney"
)

for loc in "${LOCATIONS[@]}"; do
  echo "Preloading $loc..."
  npx tsx src/scripts/test-location.ts "$loc"
  sleep 5  # Rate limiting
done
EOF

chmod +x scripts/preload-cache.sh
./scripts/preload-cache.sh
```

---

## Location & Timezone

### How Location Detection Works

```javascript
// Browser detects timezone automatically
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Example: "Europe/Dublin"

// Server extracts location dynamically
"Europe/Dublin" → { country: "IE", city: "Dublin" }
"America/New_York" → { country: "US", city: "New York" }
"Asia/Tokyo" → { country: "JP", city: "Tokyo" }

// No hardcoded locations needed!
```

### Test New Timezone

```bash
# Any IANA timezone works
npx tsx src/scripts/test-location.ts "Pacific/Auckland"
npx tsx src/scripts/test-location.ts "Africa/Cairo"
npx tsx src/scripts/test-location.ts "America/Argentina/Buenos_Aires"

# View all IANA timezones
node -e "console.log(Intl.supportedValuesOf('timeZone'))"
```

### Override User Location

```typescript
// In browser console or app code
// Temporarily override detected timezone
window.location.href = '/?timezone=Europe/Paris';

// Or in development, modify news-context.tsx:
const detectedTimezone = searchParams.get('timezone') ||
  Intl.DateTimeFormat().resolvedOptions().timeZone;
```

---

## Database Operations

### Connect to MongoDB

```bash
# Local MongoDB
mongosh mongodb://localhost:27017/news-app

# MongoDB Atlas
mongosh "mongodb+srv://cluster.mongodb.net/" --username your-user

# Test connection via app
npx tsx src/lib/db/test-connection.ts
```

### Useful MongoDB Queries

```javascript
// In mongosh:

// View all cached news
db.news.find().pretty()

// Count by location
db.news.aggregate([
  { $group: { _id: "$location", count: { $sum: 1 } } }
])

// Recent cache entries
db.news.find().sort({ "metadata.fetchedAt": -1 }).limit(10)

// Specific date + timezone
db.news.findOne({
  date: "2025-09-26",
  timezone: "Europe/Dublin"
})

// Remove old cache (older than 7 days)
const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
db.news.deleteMany({
  "metadata.fetchedAt": { $lt: sevenDaysAgo }
})
```

### Create Indexes

```bash
# Run setup script (includes indexes)
npm run db:setup

# Or manually in mongosh:
db.news.createIndex({ date: 1, timezone: 1, location: 1 }, { unique: true })
db.news.createIndex({ "metadata.fetchedAt": 1 })
```

### Backup & Restore

```bash
# Export collection
mongodump --uri="mongodb://localhost:27017/news-app" --collection=news --out=./backup

# Import collection
mongorestore --uri="mongodb://localhost:27017/news-app" --collection=news ./backup/news-app/news.bson

# Export as JSON
mongoexport --uri="mongodb://localhost:27017/news-app" --collection=news --out=news-backup.json --jsonArray
```

---

## Troubleshooting

### Problem: 402 Error (Thought it was an error!)

```bash
# 402 is NOT an error in x402 protocol!
# It's the expected response that triggers payment

# Check if you received news data after the 402:
# ✅ "Payment successful! Got news data" → Working correctly
# ❌ "Payment failed" → See below
```

### Problem: Payment Failed

```bash
# 1. Check wallet has funds
curl http://localhost:3000/api/wallet
# Need: ETH for gas + USDC for payment

# 2. Verify network matches
# Firecrawl requires: FIRECRAWL_NETWORK=base (mainnet)
# Check .env.local

# 3. Check private key format
# Must start with 0x
# Example: X402_PRIVATE_KEY=0x1234...

# 4. Reset circuit breaker
curl http://localhost:3000/api/reset-circuit

# 5. Check Firecrawl API key
echo $FIRECRAWL_API_KEY  # Should start with "fc-"

# 6. Review x402 docs via context7
# Use MCP to study official x402 protocol
```

### Problem: No News Results

```bash
# 1. Check cache first
curl "http://localhost:3000/api/news?date=2025-09-26&timezone=Europe/Dublin"

# 2. Clear cache and retry
npx tsx src/scripts/clear-cache.ts --all

# 3. Test with different location
npx tsx src/scripts/test-location.ts "America/New_York"

# 4. Check Firecrawl API directly
node scripts/test-firecrawl-direct.js

# 5. View search query being used
# Check logs for: "Generated query for date..."
# Modify query generation in x402Service.ts if needed
```

### Problem: Database Connection Failed

```bash
# 1. Check MongoDB is running
# Local:
brew services list | grep mongodb
# Or: sudo systemctl status mongod

# 2. Test connection
mongosh mongodb://localhost:27017/news-app

# 3. Verify MONGODB_URI in .env.local
cat .env.local | grep MONGODB_URI

# 4. Check network access (Atlas)
# Whitelist your IP in Atlas dashboard
# Or allow all: 0.0.0.0/0

# 5. Test from app
npx tsx src/lib/db/test-connection.ts
```

### Problem: Rate Limited / Circuit Breaker

```bash
# Circuit breaker activates after 3 payment failures

# 1. Wait 60 seconds, or reset:
curl http://localhost:3000/api/reset-circuit

# 2. Fix underlying issue (wallet, network, etc.)

# 3. Increase limits in config/x402.ts:
# rateLimit.maxRequestsPerDay
# rateLimit.maxDailyCost

# 4. Restart dev server
npm run dev
```

### Problem: Wrong Location News

```bash
# 1. Check timezone detection
# Browser console:
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

# 2. Verify location extraction
node -e "
const tz = 'Europe/Dublin';
const parts = tz.split('/');
console.log('City:', parts[1]);
"

# 3. Clear cache for that location
npx tsx src/scripts/clear-cache.ts --location "IE-Dublin"

# 4. Force specific timezone
http://localhost:3000/?timezone=Europe/Dublin

# 5. Check search query generation
# Review logs for "Generated query for date..."
```

### Problem: TypeScript Errors

```bash
# Run type checking
npm run type-check

# Common fixes:
# 1. Regenerate Next.js types
rm -rf .next
npm run dev

# 2. Update dependencies
npm update

# 3. Clear TypeScript cache
rm tsconfig.tsbuildinfo

# 4. Check path aliases in tsconfig.json
# Should have: "@/*": ["./src/*"]
```

### Problem: Using Old Firecrawl v1 Endpoint

```bash
# If you see errors about API format or missing news data:

# 1. Check your .env.local endpoint
cat .env.local | grep FIRECRAWL_API_BASE_URL
# Should be: https://api.firecrawl.dev/v2/x402/search

# 2. Update if needed
sed -i '' 's|v1/x402/search|v2/x402/search|g' .env.local

# 3. Restart dev server
pkill -f "next dev" && npm run dev

# 4. Clear cache and test
npx tsx src/scripts/clear-cache.ts --all
npx tsx src/scripts/test-location.ts "America/New_York"
```

### Problem: Build Failures

```bash
# 1. Clean build artifacts
npm run clean

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Check Node version
node --version  # Should be 18+

# 4. Build with verbose output
npm run build -- --debug

# 5. Check for environment variable issues
# Some variables need NEXT_PUBLIC_ prefix for client-side
```

---

## Advanced Recipes

### Create Custom Payment Flow

```typescript
// In a new service file
import { x402Config } from '@/config/x402';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

async function makeCustomPayment(endpoint: string) {
  const account = privateKeyToAccount(x402Config.payment.privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  // Implement your payment logic
  // See x402Service.ts for reference
}
```

### Add New News Source

```typescript
// In newsService.ts, modify fetchFreshNews:
const response = await searchNews(query, {
  limit: 20,
  sources: ['news'],  // v2 API: 'news' for news-focused results
  maxAge: 172800000,
  timezone: timezone
});

// Available sources in v2:
// - 'news': News-focused results (recommended for this app)
// - 'web': General web results
// - 'images': Image search results
```

### Implement Auto-Refresh

```typescript
// In news-context.tsx:
useEffect(() => {
  const interval = setInterval(() => {
    fetchNews(selectedDate); // Refresh every 5 minutes
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, [selectedDate]);
```

### Export News Data

```bash
# Create export script
cat > scripts/export-news.ts << 'EOF'
import { connectToDatabase } from '@/lib/db/mongodb';

async function exportNews() {
  const { db } = await connectToDatabase();
  const news = await db.collection('news').find({}).toArray();
  console.log(JSON.stringify(news, null, 2));
}

exportNews();
EOF

npx tsx scripts/export-news.ts > news-export.json
```

---

## Quick Reference

```bash
# Start development
npm run dev

# Test location
npx tsx src/scripts/test-location.ts "Europe/Dublin"

# Clear cache
npx tsx src/scripts/clear-cache.ts --all

# Check wallet
curl http://localhost:3000/api/wallet

# Reset circuit breaker
curl http://localhost:3000/api/reset-circuit

# View database
curl http://localhost:3000/api/debug-db

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```