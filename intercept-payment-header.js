import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/x402/search';

console.log('🔍 Intercepting Payment Header from wrapFetchWithPayment');
console.log('================================================');

try {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  // Intercept fetch to capture the payment header
  const originalFetch = fetch;
  let capturedPaymentHeader = null;
  let requestCount = 0;

  const interceptedFetch = async (url, options) => {
    requestCount++;
    console.log(`\n📡 Request ${requestCount}:`);
    console.log('URL:', url);
    console.log('Method:', options?.method);
    
    if (options?.headers) {
      const headers = new Headers(options.headers);
      console.log('Headers present:', Array.from(headers.keys()));
      
      if (headers.has('X-PAYMENT')) {
        capturedPaymentHeader = headers.get('X-PAYMENT');
        console.log('🔐 X-PAYMENT header captured!');
        console.log('Length:', capturedPaymentHeader.length, 'characters');
        
        // Decode and analyze
        try {
          const decoded = JSON.parse(Buffer.from(capturedPaymentHeader, 'base64').toString('utf8'));
          console.log('✅ Payment header decoded successfully');
          console.log('Payment details:');
          console.log('- Version:', decoded.x402Version);
          console.log('- Scheme:', decoded.scheme);
          console.log('- Network:', decoded.network);
          console.log('- From:', decoded.payload.authorization.from);
          console.log('- To:', decoded.payload.authorization.to);
          console.log('- Value:', decoded.payload.authorization.value);
          console.log('- Signature present:', !!decoded.payload.signature);
        } catch (decodeError) {
          console.log('❌ Failed to decode payment header:', decodeError.message);
        }
      } else {
        console.log('No X-PAYMENT header (this should be the first request)');
      }
    }

    // Call original fetch
    const result = await originalFetch(url, options);
    console.log('Response status:', result.status);
    
    return result;
  };

  const maxValue = BigInt(10.0 * 10 ** 6);
  console.log('Creating wrapFetchWithPayment with intercepted fetch...');
  
  const fetchWithPayment = wrapFetchWithPayment(interceptedFetch, walletClient, maxValue);

  const searchOptions = {
    query: 'test news',
    limit: 1
  };

  console.log('\n🚀 Making request...');
  const response = await fetchWithPayment(firecrawlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchOptions)
  });

  console.log('\n📊 Final Result:');
  console.log('Status:', response.status);
  console.log('Total requests made:', requestCount);
  console.log('Payment header captured:', !!capturedPaymentHeader);

  if (response.status === 402) {
    const body = await response.json();
    console.log('\n❌ Payment failed - analyzing...');
    
    if (capturedPaymentHeader) {
      console.log('✅ Payment header WAS sent, but server rejected it');
      console.log('This suggests server-side payment processing issue');
    } else {
      console.log('❌ Payment header was NOT sent');
      console.log('This suggests client-side payment creation issue');
    }
  } else if (response.status === 200) {
    console.log('\n🎉 Payment succeeded!');
  }

} catch (error) {
  console.error('\n💥 Test failed:', error.message);
  console.error('Stack:', error.stack);
}