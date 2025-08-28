import { generateText } from 'ai';
import { privateKeyToAccount } from 'viem/accounts';
import { createDreamsRouterAuth } from '@daydreamsai/ai-sdk-provider';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testDayDreams() {
  console.log('🌙 Testing DayDreams AI X402 Service');
  console.log('===================================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ X402_PRIVATE_KEY environment variable not found');
    return;
  }

  try {
    console.log('\n👤 Step 1: Setting up wallet account...');
    const account = privateKeyToAccount(privateKey);
    console.log('✅ Account created:', account.address);

    console.log('\n🔧 Step 2: Creating authenticated router...');
    console.log('Payment settings:');
    console.log('- Amount: $0.10 USDC (100000 atomic units)');
    console.log('- Network: base');

    const { dreamsRouter } = await createDreamsRouterAuth(account, {
      payments: { 
        amount: '100000', // $0.10 USDC (more than enough for a simple request)
        network: 'base' 
      }
    });

    console.log('✅ DreamsRouter authenticated and ready');

    console.log('\n🤖 Step 3: Testing AI text generation...');
    const prompt = 'Explain Web3 in one sentence.';
    console.log('Prompt:', prompt);
    console.log('Model: google-vertex/gemini-2.5-flash');

    const startTime = Date.now();
    
    const { text } = await generateText({
      model: dreamsRouter('google-vertex/gemini-2.5-flash'),
      prompt: prompt
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n✅ Success! AI Generation completed');
    console.log('📝 Generated text:', text);
    console.log('⏱️  Generation time:', duration, 'ms');
    console.log('💳 Payment processed automatically via X402');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Check if it's a payment-related error
    if (error.message.includes('402') || error.message.includes('payment')) {
      console.log('🔍 This appears to be a payment-related error');
      console.log('Details:', error);
    } else if (error.message.includes('model') || error.message.includes('provider')) {
      console.log('🔍 This appears to be a model/provider error');
      console.log('Details:', error);
    } else {
      console.log('🔍 Unexpected error type');
      console.log('Full error:', error);
    }
  }
}

// Also test with a smaller payment amount
async function testDayDreamsSmaller() {
  console.log('\n\n🌙 Testing DayDreams AI with Smaller Payment');
  console.log('============================================');

  const privateKey = process.env.X402_PRIVATE_KEY;
  
  try {
    const account = privateKeyToAccount(privateKey);
    console.log('👤 Account:', account.address);

    console.log('\n🔧 Creating router with smaller payment...');
    console.log('Payment settings:');
    console.log('- Amount: $0.01 USDC (10000 atomic units)');
    console.log('- Network: base');

    const { dreamsRouter } = await createDreamsRouterAuth(account, {
      payments: { 
        amount: '10000', // $0.01 USDC (same as Firecrawl)
        network: 'base' 
      }
    });

    const { text } = await generateText({
      model: dreamsRouter('google-vertex/gemini-2.5-flash'),
      prompt: 'Say hello!'
    });

    console.log('✅ Success with smaller payment!');
    console.log('📝 Response:', text);

  } catch (error) {
    console.error('❌ Failed with smaller payment:', error.message);
  }
}

// Run both tests
testDayDreams().then(() => testDayDreamsSmaller()).catch(console.error);
