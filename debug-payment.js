
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const firecrawlEndpoint = "https://api.firecrawl.dev/v1/x402/search";

if (!privateKey) {
  console.error("Missing X402_PRIVATE_KEY environment variable");
  process.exit(1);
}

console.log('Creating account from private key...');
const account = privateKeyToAccount(privateKey);
console.log('Account address:', account.address);

console.log('Creating x402 fetch client...');
const maxValue = BigInt(1 * 10 ** 6); // 1 USDC
const fetchWithPayment = wrapFetchWithPayment(fetch, account, maxValue);

const searchOptions = {
  query: "latest news today",
  limit: 1,
  sources: ["web"],
  scrapeOptions: {
    maxAge: 3600,
  }
};

console.log('Making request to Firecrawl x402 endpoint...');
console.log('Endpoint:', firecrawlEndpoint);
console.log('Search options:', searchOptions);

try {
  const response = await fetchWithPayment(firecrawlEndpoint, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchOptions)
  });

  console.log('Final response received:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  const body = await response.json();
  console.log('Response body keys:', Object.keys(body));
  console.log('Response body preview:', JSON.stringify(body).substring(0, 500) + '...');
} catch (error) {
  console.error('Error occurred:', error);
}