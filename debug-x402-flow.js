import { privateKeyToAccount } from 'viem/accounts';
import { wrapFetchWithPayment } from 'x402-fetch';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/x402/search';

async function debugX402Flow() {
  console.log('🔧 Debugging X402 Payment Flow');
  console.log('================================');
  
  const privateKey = process.env.X402_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY not found');
    return;
  }

  try {
    // Setup wallet client
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      transport: http(),
      chain: base, // Using Base mainnet as required by Firecrawl
    });

    console.log('✅ Wallet configured');
    console.log('Address:', account.address);
    console.log('Network: Base mainnet');

    // Test 1: Get payment requirements (without payment)
    console.log('\n📋 Step 1: Getting payment requirements...');
    const testPayload = {
      query: 'test query',
      limit: 1,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    };

    const response1 = await fetch(FIRECRAWL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response1.status);
    
    if (response1.status === 402) {
      const paymentData = await response1.json();
      console.log('✅ Received 402 Payment Required');
      console.log('Payment requirements:', JSON.stringify(paymentData, null, 2));
      
      // Test 2: Try x402-fetch automatic payment
      console.log('\n💳 Step 2: Testing x402-fetch automatic payment...');
      
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);
      
      try {
        const response2 = await fetchWithPayment(FIRECRAWL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        });
        
        console.log('Payment response status:', response2.status);
        
        if (response2.status === 200) {
          console.log('✅ Payment successful!');
          const data = await response2.json();
          console.log('Response data:', data.success ? 'Success' : 'Failed');
        } else {
          console.log('❌ Payment failed');
          const errorText = await response2.text();
          console.log('Error:', errorText);
        }
        
      } catch (error) {
        console.log('❌ x402-fetch error:', error.message);
      }
      
    } else {
      console.log('❌ Expected 402 status, got:', response1.status);
      const text = await response1.text();
      console.log('Response:', text);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugX402Flow();
