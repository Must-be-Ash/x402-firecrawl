import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testFixedX402() {
  console.log('🧪 Testing Fixed X402 Implementation');
  console.log('===================================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    // Step 1: Create wallet client (per X402 documentation)
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http()
    });
    console.log('✅ Wallet client created:', account.address);

    // Step 2: Use CORRECT wrapFetchWithPayment signature
    // According to X402 docs: wrapFetchWithPayment(fetch, walletClient, [maxValue], [paymentRequirementsSelector])
    console.log('🔧 Creating fetchWithPayment using correct signature...');
    const fetchWithPayment = wrapFetchWithPayment(
      fetch, 
      walletClient, 
      BigInt(1.0 * 10 ** 6) // maxValue as BigInt (optional third parameter)
    );
    console.log('✅ fetchWithPayment created successfully');

    // Step 3: Test with Firecrawl
    console.log('\n🔥 Testing with Firecrawl...');
    const endpoint = 'https://api.firecrawl.dev/v1/x402/search';
    const requestBody = {
      query: 'hello world test',
      limit: 1
    };

    console.log('Making request to:', endpoint);
    console.log('Request body:', requestBody);

    const response = await fetchWithPayment(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS! Response data:', data);
    } else {
      const errorData = await response.text();
      console.log('❌ Response failed:', errorData);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testFixedX402();
