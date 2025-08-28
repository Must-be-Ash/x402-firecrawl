import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config({ path: '.env.local' });

async function debugTimingIssue() {
  console.log('🕐 Debugging X402 Timing Issues');
  console.log('===============================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: base,
      transport: http()
    }).extend(publicActions);

    console.log('✅ Wallet setup:', account.address);

    // Get payment requirements from Firecrawl
    const response = await fetch('https://api.firecrawl.dev/v1/x402/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', limit: 1 })
    });

    const { accepts } = await response.json();
    const paymentRequirements = accepts[0];
    
    console.log('Payment requirements:', paymentRequirements);

    // Current timing (from your logs)
    const now = Math.floor(Date.now() / 1000);
    console.log('Current timestamp:', now);
    console.log('Current time (readable):', new Date(now * 1000).toISOString());

    // Test different timing approaches
    const timingTests = [
      {
        name: "Current approach (10 min before)",
        validAfter: (now - 600).toString(),
        validBefore: (now + 3600).toString()
      },
      {
        name: "Conservative approach (30 sec before)", 
        validAfter: (now - 30).toString(),
        validBefore: (now + 300).toString() // 5 min validity
      },
      {
        name: "Zero validAfter approach",
        validAfter: "0",
        validBefore: (now + 300).toString()
      },
      {
        name: "Current time approach",
        validAfter: now.toString(),
        validBefore: (now + 120).toString() // 2 min validity
      }
    ];

    for (const test of timingTests) {
      console.log(`\\n🧪 Testing: ${test.name}`);
      console.log(`- validAfter: ${test.validAfter} (${new Date(parseInt(test.validAfter) * 1000).toISOString()})`);
      console.log(`- validBefore: ${test.validBefore} (${new Date(parseInt(test.validBefore) * 1000).toISOString()})`);

      const authorization = {
        from: account.address,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter: test.validAfter,
        validBefore: test.validBefore,
        nonce: `0x${randomBytes(32).toString('hex')}`
      };

      const domain = {
        name: paymentRequirements.extra.name,
        version: paymentRequirements.extra.version,
        chainId: base.id,
        verifyingContract: paymentRequirements.asset
      };

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

      try {
        const signature = await client.signTypedData({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message: authorization
        });

        const paymentPayload = {
          x402Version: 1,
          scheme: "exact",
          network: paymentRequirements.network,
          payload: { signature, authorization }
        };

        const paymentHeader = btoa(JSON.stringify(paymentPayload));

        // Test payment
        const paymentResponse = await fetch('https://api.firecrawl.dev/v1/x402/search', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-PAYMENT': paymentHeader
          },
          body: JSON.stringify({ query: 'test', limit: 1 })
        });

        console.log(`- Result: ${paymentResponse.status}`);
        
        if (paymentResponse.status !== 402) {
          console.log('✅ SUCCESS! This timing approach worked!');
          const data = await paymentResponse.json();
          console.log('Response data:', data);
          break;
        } else {
          const errorData = await paymentResponse.json();
          console.log(`- Error: ${errorData.error || 'Empty error object'}`);
        }

      } catch (error) {
        console.log(`- Failed to create signature: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error during timing debug:', error);
  }
}

debugTimingIssue();
