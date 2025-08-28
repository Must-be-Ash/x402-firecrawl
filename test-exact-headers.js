import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { createPaymentHeader } from "x402/client";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const firecrawlEndpoint = 'https://api.firecrawl.dev/v1/x402/search';

console.log('🔍 Testing Exact Headers and Flow');
console.log('=================================');

try {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  const searchOptions = {
    query: 'test news',
    limit: 1
  };

  console.log('✅ Wallet setup:', account.address);
  console.log('📡 Testing endpoint:', firecrawlEndpoint);
  console.log('📦 Payload:', JSON.stringify(searchOptions));

  // Step 1: Initial request
  console.log('\n📡 Step 1: Initial POST request...');
  const initialResponse = await fetch(firecrawlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchOptions)
  });

  console.log('Response status:', initialResponse.status);
  
  if (initialResponse.status !== 402) {
    console.log('❌ Expected 402, got:', initialResponse.status);
    const text = await initialResponse.text();
    console.log('Response:', text);
    process.exit(1);
  }

  console.log('✅ Got 402 as expected');
  
  const paymentData = await initialResponse.json();
  const paymentRequirements = paymentData.accepts[0];
  
  console.log('💰 Payment required:', paymentRequirements.maxAmountRequired, 'units');
  console.log('💳 Pay to:', paymentRequirements.payTo);
  console.log('🌐 Network:', paymentRequirements.network);

  // Step 2: Create payment
  console.log('\n🔐 Step 2: Creating payment header...');
  const paymentHeader = await createPaymentHeader(
    walletClient,
    paymentData.x402Version,
    paymentRequirements
  );

  console.log('✅ Payment header created, length:', paymentHeader.length);
  
  // Decode to verify
  const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
  console.log('📋 Payment details:');
  console.log('  From:', decoded.payload.authorization.from);
  console.log('  To:', decoded.payload.authorization.to);  
  console.log('  Value:', decoded.payload.authorization.value);
  console.log('  Network:', decoded.network);
  console.log('  Signature length:', decoded.payload.signature?.length);

  // Step 3: Retry with payment - EXACT same request as initial
  console.log('\n🔄 Step 3: Retrying with X-PAYMENT header...');
  const paidResponse = await fetch(firecrawlEndpoint, {
    method: 'POST', // Same method
    headers: {
      'Content-Type': 'application/json', // Same content type
      'X-PAYMENT': paymentHeader // Add payment header
    },
    body: JSON.stringify(searchOptions) // Same body
  });

  console.log('📊 Final response:');
  console.log('Status:', paidResponse.status);
  console.log('Headers:', Object.fromEntries(paidResponse.headers.entries()));

  const finalBody = await paidResponse.json();
  
  if (paidResponse.status === 200) {
    console.log('\n🎉 SUCCESS! Payment accepted!');
    if (finalBody.data && finalBody.data.web) {
      console.log('📰 Found', finalBody.data.web.length, 'news articles');
      finalBody.data.web.slice(0, 2).forEach((article, i) => {
        console.log(`${i+1}. ${article.title}`);
        console.log(`   ${article.url}`);
      });
    }
  } else if (paidResponse.status === 402) {
    console.log('\n❌ Still 402 after payment');
    console.log('Response body:', JSON.stringify(finalBody, null, 2));
    
    // Analyze the error
    if (finalBody.error && typeof finalBody.error === 'string' && finalBody.error.length > 0) {
      console.log('🚨 Server error:', finalBody.error);
    } else if (finalBody.error && Object.keys(finalBody.error).length === 0) {
      console.log('🤔 Empty error object - payment was received but rejected silently');
      console.log('💡 This usually means signature verification failed on server side');
    }
  } else {
    console.log('\n⚠️ Unexpected status:', paidResponse.status);
    console.log('Response:', JSON.stringify(finalBody, null, 2));
  }

} catch (error) {
  console.error('\n💥 Test failed:', error.message);
  console.error('Stack:', error.stack);
}