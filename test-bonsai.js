import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { wrapFetchWithPayment } from "x402-fetch";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testBonsai() {
  console.log('🌸 Testing Bonsai X402 Service');
  console.log('=============================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    // Step 1: Check metadata (should be free)
    console.log('\n📊 Step 1: Getting Bonsai metadata...');
    const metadataUrl = 'https://eliza.onbons.ai/metadata';
    
    const metadataResponse = await fetch(metadataUrl);
    console.log('Metadata response status:', metadataResponse.status);
    
    if (metadataResponse.status === 200) {
      const metadata = await metadataResponse.json();
      console.log('✅ Metadata received successfully');
      console.log('- Domain:', metadata.domain);
      console.log('- Version:', metadata.version);
      console.log('- Templates available:', metadata.templates?.length || 0);
      
      if (metadata.templates && metadata.templates.length > 0) {
        console.log('\n📋 Available Templates:');
        const sortedTemplates = metadata.templates.sort((a, b) => a.estimatedCost - b.estimatedCost);
        
        sortedTemplates.forEach((template, index) => {
          console.log(`${index + 1}. ${template.name}`);
          console.log(`   - Description: ${template.description}`);
          console.log(`   - Category: ${template.category}`);
          console.log(`   - Estimated Cost: $${template.estimatedCost} USDC`);
          console.log('');
        });
        
        // Find the cheapest template
        const cheapestTemplate = sortedTemplates[0];
        console.log(`🏆 Cheapest option: ${cheapestTemplate.name} ($${cheapestTemplate.estimatedCost} USDC)`);
        
        // Step 2: Set up X402 payment client
        console.log('\n💳 Step 2: Setting up X402 payment client...');
        const account = privateKeyToAccount(privateKey);
        const client = createWalletClient({
          account,
          transport: http(),
          chain: base,
        });
        
        const maxValue = BigInt(1000000); // Allow up to $1 USDC
        const fetchWithPayment = wrapFetchWithPayment(fetch, client, maxValue);
        console.log('✅ X402 client ready');
        console.log('- Address:', account.address);
        console.log('- Max payment allowed: $1.00 USDC');
        
        // Step 3: Test prompt enhancement (usually cheaper than generation)
        console.log('\n🔧 Step 3: Testing prompt enhancement...');
        const enhanceUrl = 'https://eliza.onbons.ai/generation/enhance';
        const enhanceBody = {
          prompt: "Create a simple hello world message",
          template: cheapestTemplate.name,
          templateData: {}
        };
        
        console.log('Request details:');
        console.log('- URL:', enhanceUrl);
        console.log('- Template:', cheapestTemplate.name);
        console.log('- Prompt:', enhanceBody.prompt);
        
        const enhanceResponse = await fetchWithPayment(enhanceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(enhanceBody)
        });
        
        console.log('\n📬 Enhancement response:');
        console.log('Status:', enhanceResponse.status);
        
        if (enhanceResponse.status === 200) {
          const enhanceData = await enhanceResponse.json();
          console.log('✅ Success! Prompt enhanced');
          console.log('Enhanced prompt:', enhanceData.enhancedPrompt);
          
          const paymentResponseHeader = enhanceResponse.headers.get('x-payment-response');
          if (paymentResponseHeader) {
            console.log('💳 Payment confirmation received');
            try {
              const decoded = JSON.parse(atob(paymentResponseHeader));
              console.log('Payment details:', decoded);
            } catch (e) {
              console.log('Payment response header (base64):', paymentResponseHeader.substring(0, 100) + '...');
            }
          }
        } else {
          const errorText = await enhanceResponse.text();
          console.log('❌ Enhancement failed');
          console.log('Error response:', errorText);
        }
        
      } else {
        console.log('⚠️  No templates found in metadata');
      }
    } else {
      const errorText = await metadataResponse.text();
      console.log('❌ Failed to get metadata');
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBonsai();
