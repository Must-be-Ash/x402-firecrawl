import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/x402/search';
const privateKey = process.env.X402_PRIVATE_KEY;

if (!privateKey) {
  console.error('❌ X402_PRIVATE_KEY not found in environment');
  process.exit(1);
}

console.log('🔧 Setting up x402 payment client with proper chain configuration...');
console.log('Private key available:', !!privateKey);
console.log('Endpoint:', firecrawlEndpoint);

const searchOptions = {
  query: 'latest technology news',
  limit: 2
};

try {
  // Create account from private key
  const account = privateKeyToAccount(privateKey);
  console.log('✅ Account created:', account.address);
  
  // Create wallet client with Base chain configuration
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });
  console.log('✅ Wallet client created for Base mainnet (chain ID: 8453)');
  
  // Set maxValue high enough for the payment (0.01 USDC = 10,000 units)
  const maxValue = BigInt(0.05 * 10 ** 6); // 0.05 USDC = 50,000 units
  console.log('💰 Max payment allowed:', maxValue.toString(), 'units (0.05 USDC)');
  
  // Wrap fetch with payment - will automatically use Coinbase's facilitator
  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient, maxValue);
  console.log('🚀 Payment wrapper created with facilitator support');
  
  console.log('\n📡 Making request with payment handling...');
  
  try {
    const response = await fetchWithPayment(firecrawlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchOptions)
    });

    console.log('\n📊 Response received:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const body = await response.json();
    console.log('\n📋 Response body:');
    console.log(JSON.stringify(body, null, 2));
    
    // Check for payment response header
    const paymentResponseHeader = response.headers.get("x-payment-response");
    if (paymentResponseHeader) {
      console.log('\n💳 Payment response found:');
      try {
        const paymentResponse = decodeXPaymentResponse(paymentResponseHeader);
        console.log('Payment details:', JSON.stringify(paymentResponse, null, 2));
      } catch (err) {
        console.log('Failed to decode payment response:', err.message);
      }
    }
    
    // Check if we got news data
    if (response.status === 200 && body.success && body.data && body.data.web) {
      console.log('\n✅ SUCCESS! Got news data:');
      console.log('Articles found:', body.data.web.length);
      body.data.web.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   URL: ${article.url}`);
      });
    } else if (response.status === 402) {
      console.log('\n❌ Still got 402 - payment flow failed');
      if (body.error) {
        console.log('Error:', body.error);
      }
    } else {
      console.log('\n⚠️ Unexpected response');
    }
    
  } catch (fetchError) {
    console.error('\n💥 Error during fetchWithPayment:', fetchError.message);
    console.error('Stack:', fetchError.stack);
    console.error('Full error object:', fetchError);
  }
  
} catch (error) {
  console.error('\n💥 Setup Error:', error.message);
  console.error('Stack:', error.stack);
}