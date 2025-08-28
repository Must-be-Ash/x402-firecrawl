import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testFinalFix() {
  console.log('🔧 Testing Final X402 Fix');
  console.log('========================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    // Step 1: Create wallet client with publicActions (per X402 docs)
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http()
    }).extend(publicActions);
    
    console.log('✅ Wallet client with publicActions created:', account.address);
    console.log('✅ Chain:', base.name, '(ID:', base.id, ')');

    // Step 2: Create fetchWithPayment using correct signature
    console.log('🔧 Creating fetchWithPayment...');
    const fetchWithPayment = wrapFetchWithPayment(
      fetch, 
      walletClient, 
      BigInt(1.0 * 10 ** 6) // Allow up to $1.00 USDC payments
    );
    console.log('✅ fetchWithPayment created successfully');

    // Step 3: Test with Firecrawl
    console.log('\n🔥 Testing with Firecrawl...');
    const endpoint = 'https://api.firecrawl.dev/v1/x402/search';
    const requestBody = {
      query: 'test payment flow',
      limit: 1
    };

    console.log('Making request to:', endpoint);
    const startTime = Date.now();

    const response = await fetchWithPayment(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const endTime = Date.now();
    console.log(`Request completed in ${endTime - startTime}ms`);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! X402 Payment worked!');
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ Response failed:', errorData);
      
      // If it's still a 402, that means the payment flow is working but payment validation failed
      if (response.status === 402) {
        console.log('ℹ️  Note: 402 response means X402 library is working, but payment validation failed');
      }
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testFinalFix();
