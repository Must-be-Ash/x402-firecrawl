import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { createPaymentHeader } from "x402/client";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/x402/search';
const privateKey = process.env.X402_PRIVATE_KEY;

if (!privateKey) {
  console.error('❌ X402_PRIVATE_KEY not found in environment');
  process.exit(1);
}

console.log('🔧 Manual x402 payment flow test...');
console.log('Endpoint:', firecrawlEndpoint);

const searchOptions = {
  query: 'latest technology news',
  limit: 2
};

try {
  // Create account and wallet client
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });
  
  console.log('✅ Wallet configured:', account.address);
  console.log('✅ Chain ID:', base.id);
  
  // Step 1: Make initial request (should return 402)
  console.log('\n📡 Step 1: Making initial request...');
  const initialResponse = await fetch(firecrawlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchOptions)
  });
  
  console.log('Initial response status:', initialResponse.status);
  
  if (initialResponse.status === 402) {
    console.log('✅ Got 402 - payment required (expected)');
    
    // Step 2: Parse payment requirements
    const paymentData = await initialResponse.json();
    console.log('\n📋 Payment requirements:');
    console.log(JSON.stringify(paymentData, null, 2));
    
    const paymentRequirements = paymentData.accepts[0];
    console.log('\n💰 Payment details:');
    console.log('Amount required:', paymentRequirements.maxAmountRequired, 'units ($0.01 USDC)');
    console.log('Pay to:', paymentRequirements.payTo);
    console.log('Network:', paymentRequirements.network);
    console.log('Scheme:', paymentRequirements.scheme);
    
    // Step 3: Create payment header
    console.log('\n🔐 Step 3: Creating payment header...');
    try {
      const paymentHeader = await createPaymentHeader(
        walletClient, 
        paymentData.x402Version, 
        paymentRequirements
      );
      console.log('✅ Payment header created successfully');
      console.log('Header length:', paymentHeader.length, 'characters');
      
      // Step 4: Retry request with payment
      console.log('\n🔄 Step 4: Retrying with payment header...');
      const paidResponse = await fetch(firecrawlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': paymentHeader
        },
        body: JSON.stringify(searchOptions)
      });
      
      console.log('\n📊 Final response:');
      console.log('Status:', paidResponse.status);
      console.log('Headers:', Object.fromEntries(paidResponse.headers.entries()));
      
      const finalBody = await paidResponse.json();
      console.log('\n📋 Response body:');
      console.log(JSON.stringify(finalBody, null, 2));
      
      if (paidResponse.status === 200 && finalBody.success && finalBody.data && finalBody.data.web) {
        console.log('\n🎉 SUCCESS! Got news data:');
        console.log('Articles found:', finalBody.data.web.length);
        finalBody.data.web.forEach((article, index) => {
          console.log(`${index + 1}. ${article.title}`);
          console.log(`   URL: ${article.url}`);
          console.log('   ---');
        });
      } else if (paidResponse.status === 402) {
        console.log('\n❌ Still got 402 after payment');
        if (finalBody.error) {
          console.log('Error details:', finalBody.error);
        }
      } else {
        console.log('\n⚠️ Unexpected response status');
      }
      
    } catch (paymentError) {
      console.error('\n💥 Error creating payment header:', paymentError.message);
      console.error('Stack:', paymentError.stack);
    }
    
  } else {
    console.log('❌ Expected 402 but got:', initialResponse.status);
    const body = await initialResponse.text();
    console.log('Response body:', body);
  }
  
} catch (error) {
  console.error('\n💥 Test failed:', error.message);
  console.error('Stack:', error.stack);
}