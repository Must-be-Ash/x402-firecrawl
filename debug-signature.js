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

    // Get payment requirements from Firecrawl
    const response = await fetch('https://api.firecrawl.dev/v1/x402/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', limit: 1 })
    });

    if (response.status !== 402) {
      console.log('❌ Expected 402, got:', response.status);
      return;
    }

    const { accepts } = await response.json();
    const paymentRequirements = accepts[0];
    
    console.log('Payment requirements:', paymentRequirements);

    // Create authorization object
    const now = Math.floor(Date.now() / 1000);
    const authorization = {
      from: account.address,
      to: paymentRequirements.payTo,
      value: paymentRequirements.maxAmountRequired,
      validAfter: (now - 600).toString(), // 10 minutes ago
      validBefore: (now + 3600).toString(), // 1 hour from now
      nonce: `0x${randomBytes(32).toString('hex')}`
    };

    console.log('Authorization object:', authorization);

    // Create EIP-712 domain
    const domain = {
      name: paymentRequirements.extra.name, // "USD Coin"
      version: paymentRequirements.extra.version, // "2"
      chainId: base.id, // 8453
      verifyingContract: paymentRequirements.asset // USDC contract address
    };

    console.log('EIP-712 domain:', domain);

    // Create types for EIP-3009
    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    };

    console.log('Signing authorization with EIP-712...');
    
    // Sign the authorization
    const signature = await client.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message: authorization
    });

    console.log('✅ Signature created:', signature);

    // Create payment payload
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: paymentRequirements.network,
      payload: {
        signature,
        authorization
      }
    };

    console.log('Payment payload:', paymentPayload);

    // Create payment header
    const paymentHeader = btoa(JSON.stringify(paymentPayload));
    console.log('Payment header (base64):', paymentHeader.substring(0, 100) + '...');

    // Test payment with manual header
    console.log('\n🧪 Testing payment with manual header...');
    const paymentResponse = await fetch('https://api.firecrawl.dev/v1/x402/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader
      },
      body: JSON.stringify({ query: 'test', limit: 1 })
    });

    console.log('Payment response status:', paymentResponse.status);
    console.log('Payment response headers:', Object.fromEntries(paymentResponse.headers.entries()));

    if (paymentResponse.ok) {
      const data = await paymentResponse.json();
      console.log('✅ PAYMENT SUCCESS! Response:', data);
    } else {
      const errorData = await paymentResponse.json();
      console.log('❌ Payment failed. Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Error during signature debugging:', error);
  }
}

debugSignature();
