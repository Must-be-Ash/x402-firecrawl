# Location-Based News Testing Guide

## Overview
The news app is now **fully dynamic** and automatically detects visitor location from their timezone to fetch location-specific news.

## How It Works

1. **Browser Detection**:
   - Automatically detects timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - Falls back to Vancouver if detection fails

2. **URL Override** (for testing):
   - Add `?timezone=<IANA_TIMEZONE>` to URL
   - Example: `http://localhost:3000/?timezone=Europe/Dublin`

3. **Location Extraction**:
   - Parses IANA timezone format dynamically (no hardcoded cities!)
   - `Europe/Dublin` → `IE-Dublin` (cache key) + `"Dublin, Ireland"` (search query)
   - `America/New_York` → `US-NewYork` + `"New York, United States"`

4. **News Fetching**:
   - Generates location-specific queries: "Dublin, Ireland breaking news today"
   - Sends country code to Firecrawl API: `location: "IE"`
   - Caches results with location identifier: `(date, timezone, location)`

## Testing Commands

### Clear Cache
```bash
# Clear all cache
npx tsx src/scripts/clear-cache.ts --all

# Clear specific location
npx tsx src/scripts/clear-cache.ts --location IE-Dublin

# Clear specific date
npx tsx src/scripts/clear-cache.ts --date 2025-09-26

# Clear specific timezone
npx tsx src/scripts/clear-cache.ts --timezone Europe/Dublin
```

### Test Locations via CLI
```bash
# Test single location
npx tsx src/scripts/test-location.ts "Europe/Dublin"

# Test multiple locations
npx tsx src/scripts/test-location.ts --all

# Test with specific date
npx tsx src/scripts/test-location.ts "Asia/Tokyo" "2025-09-25"
```

### Test in Browser
```bash
# Start dev server
npm run dev

# Visit with different timezones:
# Dublin, Ireland
http://localhost:3000/?timezone=Europe/Dublin

# New York, USA
http://localhost:3000/?timezone=America/New_York

# Tokyo, Japan
http://localhost:3000/?timezone=Asia/Tokyo

# London, UK
http://localhost:3000/?timezone=Europe/London

# Vancouver, Canada
http://localhost:3000/?timezone=America/Vancouver

# Sydney, Australia
http://localhost:3000/?timezone=Australia/Sydney
```

## Expected Behavior

✅ **Correct**: Each location shows different news
- Dublin visitor sees Irish/Dublin news
- New York visitor sees US/New York news
- Tokyo visitor sees Japanese/Tokyo news

❌ **Wrong** (old behavior): All visitors saw Vancouver news

## Verification Checklist

- [ ] Different locations show different news articles
- [ ] Cache keys include location: `IE-Dublin`, `US-NewYork`, etc.
- [ ] Search queries are location-specific
- [ ] No "Unknown timezone" warnings for major cities
- [ ] Cached results are reused for same (date, timezone, location) combo
- [ ] Fresh fetches occur for new locations

## Cache Structure

MongoDB `daily_news` collection:
```javascript
{
  date: "2025-09-26",
  timezone: "Europe/Dublin",
  location: "IE-Dublin",  // 👈 Location identifier
  articles: [...],
  metadata: {
    searchQuery: "Dublin, Ireland breaking news today",
    country: "IE"
  }
}
```

## Supported Locations

**ANY** IANA timezone is supported! The system dynamically extracts:
- Country code from timezone (using continent/city mapping)
- City name from timezone (parsed from IANA format)
- Default languages for country

No hardcoded locations needed!