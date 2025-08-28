import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/x402/search';

console.log('🔍 Debugging wrapFetchWithPayment Flow');
console.log('====================================');

try {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  console.log('✅ Wallet Setup Complete');
  console.log('Address:', account.address);
  console.log('Chain ID:', base.id);

  // Set high maxValue to eliminate any limit issues
  const maxValue = BigInt(10.0 * 10 ** 6); // 10 USDC
  console.log('Max value set to:', maxValue.toString(), 'units (10 USDC)');

  const searchOptions = {
    query: 'test news',
    limit: 1
  };

  console.log('\n📡 Creating wrapFetchWithPayment...');
  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient, maxValue);
  
  console.log('\n🚀 Making request with wrapFetchWithPayment...');
  console.log('Endpoint:', firecrawlEndpoint);
  console.log('Payload:', JSON.stringify(searchOptions));

  // Add detailed error handling
  try {
    const response = await fetchWithPayment(firecrawlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchOptions)
    });

    console.log('\n📊 Response from wrapFetchWithPayment:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const body = await response.json();
    console.log('\nResponse Body:');
    console.log(JSON.stringify(body, null, 2));

    if (response.status === 200) {
      console.log('\n🎉 SUCCESS! Payment worked!');
      if (body.data && body.data.web) {
        console.log('Found', body.data.web.length, 'news articles');
      }
    } else if (response.status === 402) {
      console.log('\n❌ Still got 402 - payment failed');
      console.log('This means wrapFetchWithPayment did not create/send payment header');
      
      // Check if the error gives us more info
      if (body.error && typeof body.error === 'string' && body.error.length > 0) {
        console.log('Server error message:', body.error);
      } else if (Object.keys(body.error).length === 0) {
        console.log('Empty error object - payment header might be invalid');
      }
    }

  } catch (wrapError) {
    console.error('\n💥 wrapFetchWithPayment threw an error:');
    console.error('Error type:', wrapError.constructor.name);
    console.error('Error message:', wrapError.message);
    console.error('Stack trace:', wrapError.stack);
    
    // Check for specific error types
    if (wrapError.message.includes('Payment amount exceeds maximum allowed')) {
      console.log('\n💡 Analysis: maxValue is too low');
      console.log('Current maxValue:', maxValue.toString());
      console.log('Required amount: 10000 units');
    } else if (wrapError.message.includes('Missing fetch request configuration')) {
      console.log('\n💡 Analysis: Request init object is missing');
    } else if (wrapError.message.includes('Payment already attempted')) {
      console.log('\n💡 Analysis: Duplicate payment attempt detected');
    } else {
      console.log('\n💡 Analysis: Unknown error in payment processing');
    }
  }

} catch (setupError) {
  console.error('\n💥 Setup Error:', setupError.message);
  console.error('Stack:', setupError.stack);
}