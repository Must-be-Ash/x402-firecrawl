import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config({ path: '.env.local' });

async function debugSignature() {
  console.log('🔍 Debugging X402 Signature Creation');
  console.log('===================================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      transport: http(),
      chain: base,
    });

    console.log('✅ Wallet setup complete');
    console.log('Address:', account.address);
    console.log('Chain ID:', base.id); // Should be 8453 for Base mainnet

    // Step 1: Get payment requirements
    const url = 'https://api.firecrawl.dev/v1/x402/search';
    const requestBody = {
      query: 'test news',
      limit: 1,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    };

    console.log('\n📋 Getting payment requirements...');
    const initialResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (initialResponse.status !== 402) {
      console.error('❌ Expected 402, got:', initialResponse.status);
      return;
    }

    const paymentData = await initialResponse.json();
    const requirement = paymentData.accepts[0];
    
    console.log('Payment requirement received:');
    console.log('- Amount:', requirement.maxAmountRequired, '(0.01 USDC)');
    console.log('- PayTo:', requirement.payTo);
    console.log('- Asset:', requirement.asset);
    console.log('- Network:', requirement.network);
    console.log('- Extra:', JSON.stringify(requirement.extra));

    // Step 2: Create manual payment signature
    console.log('\n🔐 Creating payment signature...');
    
    const now = Math.floor(Date.now() / 1000);
    const validAfter = (now - 300).toString(); // 5 minutes before now
    const validBefore = (now + 300).toString(); // 5 minutes from now
    const nonce = `0x${randomBytes(32).toString('hex')}`;

    // EIP-712 domain for USDC on Base
    const domain = {
      name: requirement.extra.name, // "USD Coin"
      version: requirement.extra.version, // "2"
      chainId: base.id, // 8453 for Base mainnet
      verifyingContract: requirement.asset,
    };

    console.log('EIP-712 Domain:', domain);

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from: account.address,
      to: requirement.payTo,
      value: requirement.maxAmountRequired,
      validAfter,
      validBefore,
      nonce,
    };

    console.log('Message to sign:', message);

    // Sign the message
    const signature = await client.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    });

    console.log('✅ Signature created:', signature.length, 'chars');

    // Step 3: Create payment payload
    const paymentPayload = {
      x402Version: paymentData.x402Version,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        signature,
        authorization: message,
      },
    };

    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
    console.log('✅ Payment header created:', paymentHeader.length, 'chars');

    // Step 4: Make payment request
    console.log('\n💳 Making payment request...');
    const paymentResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader,
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Payment response status:', paymentResponse.status);
    
    if (paymentResponse.status === 200) {
      console.log('✅ Payment successful!');
      const data = await paymentResponse.json();
      console.log('Data received:', {
        success: data.success,
        resultsCount: data.data?.web?.length || 0
      });
    } else {
      const errorText = await paymentResponse.text();
      console.log('❌ Payment failed');
      console.log('Error response:', errorText);
      
      // Check if it's a verification error
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error && typeof errorData.error === 'string') {
          console.log('🔍 Specific error:', errorData.error);
        }
      } catch (e) {
        // Error response is not JSON
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugSignature();
