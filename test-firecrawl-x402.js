import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
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

console.log('Creating wallet client...');
const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: base,
});

console.log('Creating x402 fetch client...');
const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);

const searchOptions = {
  query: "latest news today",
  limit: 1,
  sources: ["cnn.com", "bbc.com"],
  scrapeOptions: {
    maxAge: 3600,
  }
};

console.log('Making request to Firecrawl x402 endpoint...');
console.log('Endpoint:', firecrawlEndpoint);
console.log('Search options:', searchOptions);

fetchWithPayment(firecrawlEndpoint, {
  method: "POST",
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(searchOptions)
})
  .then(async response => {
    console.log('Final response received:', {
      status: response.status,
      statusText: response.statusText,
      hasPaymentResponse: !!response.headers.get("x-payment-response"),
      contentType: response.headers.get('content-type')
    });

    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));

    const paymentResponse = response.headers.get("x-payment-response");
    if (paymentResponse) {
      const decoded = decodeXPaymentResponse(paymentResponse);
      console.log('Payment response:', decoded);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });