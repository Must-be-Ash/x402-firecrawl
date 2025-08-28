import { x402Config } from '@/config/x402';
import { FirecrawlSearchResponse } from '@/lib/types/news';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { createFacilitatorConfig } from "@coinbase/x402";
import { useFacilitator } from "x402/verify";
import { createPaymentHeader } from "x402/client";

// Manual x402 payment flow with CDP facilitator authentication
async function makePaymentRequest(endpoint: string, body: any): Promise<FirecrawlSearchResponse> {
  const privateKey = x402Config.payment.privateKey;
  
  if (!privateKey) {
    throw new Error('X402_PRIVATE_KEY is required for payment functionality');
  }
  
  // Get CDP API credentials from environment
  const cdpApiKeyId = process.env.CDP_API_KEY_ID;
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
  
  if (!cdpApiKeyId || !cdpApiKeySecret) {
    throw new Error('CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for facilitator authentication');
  }
  
  console.log('Making x402 payment request with CDP facilitator...');
  console.log('CDP API Key ID:', cdpApiKeyId);
  
  // Step 1: Initial request to get payment requirements
  console.log('Step 1: Making initial request to get payment requirements');
  const initialResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (initialResponse.status !== 402) {
    throw new Error(`Expected 402 Payment Required, got ${initialResponse.status}`);
  }
  
  const paymentData = await initialResponse.json();
  const paymentRequirements = paymentData.accepts[0];
  
  console.log('Payment required:', paymentRequirements.maxAmountRequired, 'units');
  
  // Step 2: Create payment header
  console.log('Step 2: Creating payment header with CDP facilitator');
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });
  
  const paymentHeader = await createPaymentHeader(
    walletClient,
    paymentData.x402Version,
    paymentRequirements
  );
  
  // Step 3: Verify payment with our own facilitator
  console.log('Step 3: Verifying payment with CDP facilitator using our credentials');
  const facilitatorConfig = createFacilitatorConfig(cdpApiKeyId, cdpApiKeySecret);
  const { verify, settle } = useFacilitator(facilitatorConfig);
  
  const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
  
  const verifyResponse = await verify(decoded, paymentRequirements);
  console.log('Verification response:', verifyResponse);
  
  if (!verifyResponse.isValid) {
    throw new Error(`Payment verification failed: ${verifyResponse.invalidReason}`);
  }
  
  // Step 4: Settle payment
  console.log('Step 4: Settling payment');
  const settleResponse = await settle(decoded, paymentRequirements);
  console.log('Settlement response:', settleResponse);
  
  if (!settleResponse.success) {
    throw new Error(`Payment settlement failed: ${settleResponse.errorReason}`);
  }
  
  // Step 5: Make final request with payment proof
  console.log('Step 5: Making final request with payment header');
  const finalResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': paymentHeader
    },
    body: JSON.stringify(body)
  });
  
  const finalBody = await finalResponse.json();
  
  if (finalResponse.status === 200 && finalBody.success) {
    console.log('Payment successful! Got news data');
    return finalBody as FirecrawlSearchResponse;
  } else {
    throw new Error(`Final request failed: ${finalResponse.status} - ${JSON.stringify(finalBody)}`);
  }
}

export async function searchNews(query: string, options?: {
  limit?: number;
  sources?: string[];
  maxAge?: number;
}): Promise<FirecrawlSearchResponse> {
  const searchOptions = {
    query,
    sources: options?.sources || x402Config.search.defaultOptions.sources,
    limit: options?.limit || x402Config.search.defaultOptions.limit,
    scrapeOptions: {
      ...x402Config.search.defaultOptions.scrapeOptions,
      maxAge: options?.maxAge || x402Config.search.defaultOptions.scrapeOptions.maxAge,
    }
  };
  
  console.log('Making Firecrawl search request with manual x402 payment flow...');
  
  try {
    return await makePaymentRequest(x402Config.firecrawlEndpoint, searchOptions);
  } catch (error) {
    console.error('Search failed:', error);
    throw new Error(`Failed to search news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateNewsQuery(date: string, timezone: string = 'UTC'): string {
  // Create a more specific search query for the date
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    timeZone: timezone
  });
  
  // Generate location-specific query if timezone suggests location
  let locationHint = '';
  if (timezone.includes('Vancouver') || timezone.includes('Pacific')) {
    locationHint = 'Vancouver Canada ';
  } else if (timezone.includes('New_York') || timezone.includes('Eastern')) {
    locationHint = 'United States ';
  } else if (timezone.includes('London') || timezone.includes('GMT')) {
    locationHint = 'United Kingdom ';
  }
  
  return `${locationHint}latest news ${formattedDate} breaking news today current events`;
}

export async function testFirecrawlConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Test actual Firecrawl search with a minimal query
    const testQuery = 'test news today';
    const response = await searchNews(testQuery, { limit: 1 });
    
    if (response.success && response.data.web && response.data.web.length > 0) {
      return {
        success: true,
        message: `Firecrawl connection successful. Found ${response.data.web.length} results.`
      };
    } else {
      return {
        success: false,
        message: 'Firecrawl connection successful but no results returned'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Firecrawl connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}