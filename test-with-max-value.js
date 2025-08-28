import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testWithMaxValue() {
  console.log('🧪 Testing X402 with Explicit Max Value');
  console.log('=====================================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    const account = privateKeyToAccount(privateKey);
    console.log('✅ Account created:', account.address);

    const client = createWalletClient({
      account,
      transport: http(),
      chain: base,
    });
    console.log('✅ Wallet client created for Base mainnet');

    // Test with explicit maxValue parameter (Firecrawl requires 10000 = $0.01 USDC)
    const maxValue = BigInt(100000); // Allow up to $0.10 USDC (10x the required amount)
    const fetchWithPayment = wrapFetchWithPayment(fetch, client, maxValue);
    console.log('✅ Fetch wrapper created with maxValue:', maxValue.toString(), '(0.1 USDC)');

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

    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n📬 Response received:');
    console.log('Status:', response.status);

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Success! Payment completed');
      console.log('Results:', {
        success: data.success,
        resultsCount: data.data?.web?.length || 0
      });
      
      const paymentResponseHeader = response.headers.get('x-payment-response');
      if (paymentResponseHeader) {
        console.log('💳 Payment confirmation received');
        // Decode payment response if needed
        try {
          const decoded = JSON.parse(atob(paymentResponseHeader));
          console.log('Payment details:', decoded);
        } catch (e) {
          console.log('Payment response header (base64):', paymentResponseHeader);
        }
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Request failed with status:', response.status);
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testWithMaxValue();
