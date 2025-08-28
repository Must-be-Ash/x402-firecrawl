import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Following the exact buyer documentation pattern
async function testBuyerPattern() {
  console.log('🧪 Testing X402 Buyer Pattern (Per Documentation)');
  console.log('==================================================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    // Step 1: Create wallet account (per buyer docs)
    const account = privateKeyToAccount(privateKey);
    console.log('✅ Account created:', account.address);

    // Step 2: Create wallet client (per buyer docs)
    const client = createWalletClient({
      account,
      transport: http(),
      chain: base, // Using Base mainnet as required by Firecrawl
    });
    console.log('✅ Wallet client created for Base mainnet');

    // Step 3: Wrap fetch with payment (per buyer docs)
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    console.log('✅ Fetch wrapper created');

    // Step 4: Make paid request (per buyer docs pattern)
    const url = 'https://api.firecrawl.dev/v1/x402/search';
    const requestBody = {
      query: 'test news',
      limit: 1,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    };

    console.log('\n📡 Making request to:', url);
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n📬 Response received:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Success! Data received:', {
        success: data.success,
        resultsCount: data.data?.web?.length || 0
      });
      
      // Check for payment response header (per docs)
      const paymentResponseHeader = response.headers.get('x-payment-response');
      if (paymentResponseHeader) {
        console.log('💳 Payment response header found');
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Request failed');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBuyerPattern();
