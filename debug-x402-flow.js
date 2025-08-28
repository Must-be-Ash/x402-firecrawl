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
    console.log('- Account address:', account.address);
    console.log('- Chain:', base.name, '(ID:', base.id, ')');

    // Create payment-enabled fetch
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    console.log('✅ Payment-enabled fetch created');

    // Test request
    console.log('\n🔍 Making test request to Firecrawl...');
    const response = await fetchWithPayment(FIRECRAWL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'test search',
        limit: 1
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! Response data:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Response failed. Error data:', errorData);
    }

  } catch (error) {
    console.error('❌ Error in X402 flow:', error);
  }
}

debugX402Flow();
