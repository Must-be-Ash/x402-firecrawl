import { x402Config } from '@/config/x402';
import { FirecrawlSearchResponse } from '@/lib/types/news';
import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { wrapFetchWithPayment } from "x402-fetch";
import { randomBytes } from 'crypto';
import { getLocationFromTimezone, getLocationNameFromTimezone } from '@/lib/utils/date-utils';

// Manual x402 payment flow following official x402 patterns
async function makePaymentRequestX402Standard(endpoint: string, body: Record<string, unknown>): Promise<FirecrawlSearchResponse> {
  const privateKey = x402Config.payment.privateKey;
  
  if (!privateKey) {
    throw new Error('X402_PRIVATE_KEY is required for payment functionality');
  }
  
  console.log('Making manual x402 payment request following official standards...');
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  // Create wallet client for chain ID detection
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  }).extend(publicActions);
  
  // Make initial request to get 402 response and payment requirements
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  
  if (response.status !== 402) {
    throw new Error(`Expected 402 Payment Required, got ${response.status}`);
  }
  
  const { x402Version, accepts } = await response.json();
  const paymentRequirements = accepts[0];
  
  console.log('Payment requirements received:', {
    amount: paymentRequirements.maxAmountRequired,
    payTo: paymentRequirements.payTo,
    asset: paymentRequirements.asset,
    network: paymentRequirements.network,
    scheme: paymentRequirements.scheme
  });
  
  // Follow official x402 timing pattern: validAfter = 10 minutes before now
  const now = Math.floor(Date.now() / 1000);
  const validAfter = (now - 600).toString(); // 10 minutes before
  const validBefore = (now + (paymentRequirements.maxTimeoutSeconds || 3600)).toString();
  const nonce = `0x${randomBytes(32).toString('hex')}`;
  
  // Create EIP-712 domain matching x402 standards - use exact values from payment requirements
  const domain = {
    name: paymentRequirements.extra?.name || 'USD Coin',
    version: paymentRequirements.extra?.version || '2', 
    chainId: await walletClient.getChainId(), // Get actual chain ID from wallet client
    verifyingContract: paymentRequirements.asset as `0x${string}`,
  };
  
  // EIP-712 types for USDC transferWithAuthorization
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
  
  const authorizationMessage = {
    from: account.address,
    to: paymentRequirements.payTo,
    value: paymentRequirements.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
  };
  
  // Sign with EIP-712
  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message: authorizationMessage,
  });
  
  // Create payment payload following x402 standards (NO extra field!)
  const paymentPayload = {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      },
    },
  };
  
  // Encode as base64
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  
  console.log('Payment header created successfully');
  console.log('- Signature length:', signature.length);
  console.log('- From address:', account.address);
  console.log('- Amount:', paymentRequirements.maxAmountRequired);
  console.log('- validAfter:', validAfter, '(10 min before now)');
  console.log('- validBefore:', validBefore);
  
  // Retry request with payment header
  const finalResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'X-PAYMENT': paymentHeader,
    },
    body: JSON.stringify(body)
  });
  
  console.log('Payment response status:', finalResponse.status);
  
  if (finalResponse.status === 200) {
    const result = await finalResponse.json();
    console.log('🎉 Payment successful! Got news data');
    console.log('Articles found:', result.data?.web?.length || 0);
    return result as FirecrawlSearchResponse;
  } else {
    const errorBody = await finalResponse.json();
    console.log('❌ Payment failed:', errorBody);
    throw new Error(`Payment failed: ${finalResponse.status} - ${JSON.stringify(errorBody)}`);
  }
}

// Simple x402-fetch approach
async function searchNewsWithX402Fetch(query: string, options?: {
  limit?: number;
  sources?: string[];
  maxAge?: number;
  timezone?: string;
}): Promise<FirecrawlSearchResponse> {
  const privateKey = x402Config.payment.privateKey;
  
  if (!privateKey) {
    throw new Error('X402_PRIVATE_KEY is required for payment functionality');
  }

  console.log('Using x402-fetch library for automatic payment handling...');
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  // Create SignerWallet with Base chain configuration for proper chainId detection
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  }).extend(publicActions);

  // x402-fetch needs walletClient with chain info for chainId detection
  // Per X402 docs: wrapFetchWithPayment takes only 2 required parameters: fetch and walletClient
  // Optional third parameter is maxValue as a BigInt, fourth is paymentRequirementsSelector function
  const fetchWithPayment = wrapFetchWithPayment(
    fetch, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletClient as any, // Type assertion needed for viem/x402-fetch version compatibility
    BigInt(1.0 * 10 ** 6) // Allow up to $1.00 USDC payments
  );
  
  // Get dynamic location from timezone
  const locationInfo = options?.timezone ? getLocationFromTimezone(options.timezone) : null;
  
  // Enhanced search options for better news targeting
  const searchOptions = {
    query,
    limit: Math.min(options?.limit || 30, 30), // Increase to 30 to get more results before filtering
    // X402 endpoint expects location as a string (country code), not object
    ...(locationInfo ? {
      location: locationInfo.country
    } : {})
    // Note: v1 x402 endpoint doesn't support 'sources' parameter
  };

  console.log('Searching with x402-fetch for query:', query);
  console.log('DEBUG: Endpoint URL:', x402Config.firecrawlEndpoint);
  console.log('DEBUG: Request body:', JSON.stringify(searchOptions, null, 2));

  const response = await fetchWithPayment(x402Config.firecrawlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify(searchOptions)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firecrawl API error:', response.status, errorText);
    throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as FirecrawlSearchResponse;
  console.log('🎉 x402-fetch payment and search successful!');
  console.log('Articles found:', result.data?.web?.length || 0);
  
  // Debug: Log the full response structure to understand x402 format
  console.log('Raw Firecrawl x402 response:', JSON.stringify(result, null, 2));
  
  return result;
}

// Circuit breaker to prevent rapid failed payment attempts
let lastFailureTime = 0;
let failureCount = 0;
const CIRCUIT_BREAKER_DELAY = 60000; // 1 minute
const MAX_FAILURES = 3;

// Reset circuit breaker function
export function resetCircuitBreaker() {
  failureCount = 0;
  lastFailureTime = 0;
  console.log('Circuit breaker reset');
}

export async function searchNews(query: string, options?: {
  limit?: number;
  sources?: string[];
  maxAge?: number;
  timezone?: string;
}): Promise<FirecrawlSearchResponse> {
  console.log('Searching for news with query:', query);

  // Circuit breaker: prevent rapid retries after failures
  const now = Date.now();
  if (failureCount >= MAX_FAILURES && (now - lastFailureTime) < CIRCUIT_BREAKER_DELAY) {
    const waitTime = Math.ceil((CIRCUIT_BREAKER_DELAY - (now - lastFailureTime)) / 1000);
    throw new Error(`Payment system cooling down. Please wait ${waitTime} seconds before retrying. This prevents rapid API calls to Firecrawl.`);
  }

  try {
    // Try the x402-fetch approach first (should handle payments automatically)
    const result = await searchNewsWithX402Fetch(query, { ...options, timezone: options?.timezone });
    // Reset failure count on success
    failureCount = 0;
    return result;
  } catch (error) {
    console.error('x402-fetch approach failed, falling back to manual:', error);
    
    // Update failure tracking
    failureCount++;
    lastFailureTime = now;
    
    // Get dynamic location from timezone for fallback
    const locationInfo = options?.timezone ? getLocationFromTimezone(options.timezone) : null;
    
    // Fall back to manual approach - use same enhanced structure
    const searchOptions = {
      query,
      limit: Math.min(options?.limit || 10, 10), // Max 10 for x402 endpoint
      // X402 endpoint expects location as a string (country code), not object
      ...(locationInfo ? {
        location: locationInfo.country
      } : {})
    };
    
    console.log('Falling back to manual x402 standard payment flow...');
    try {
      const result = await makePaymentRequestX402Standard(x402Config.firecrawlEndpoint, searchOptions);
      // Reset failure count on success
      failureCount = 0;
      return result;
    } catch (manualError) {
      // Both approaches failed - update failure count
      failureCount++;
      lastFailureTime = now;
      console.error('Manual payment approach also failed:', manualError);
      throw new Error(`Both x402-fetch and manual payment approaches failed. System will pause for ${CIRCUIT_BREAKER_DELAY/1000}s to prevent rapid API calls.`);
    }
  }
}

export function generateNewsQuery(date: string, timezone: string = 'UTC'): string {
  // Create a more specific search query for the date
  const dateObj = new Date(date + 'T12:00:00Z'); // Add time to avoid timezone issues
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC' // Use UTC to ensure consistency
  });

  // Get dynamic location info based on timezone
  const locationInfo = getLocationFromTimezone(timezone);

  // Make query less date-specific to increase chance of finding results
  // For dates in the future or recent past, use more general terms
  const now = new Date();
  const queryDate = new Date(date + 'T12:00:00Z');
  const daysDiff = Math.ceil((queryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Create dynamic domain-specific queries based on location
  let query;
  const country = locationInfo.country;

  // Get dynamic location name from timezone
  const locationName = getLocationNameFromTimezone(timezone);

  // Build targeted search queries optimized for news content
  // Use clear news-focused terms that Firecrawl understands
  if (daysDiff === 0) {
    // Today's news - focus on current headlines
    query = `${locationName} breaking news today headlines`;
  } else if (daysDiff === -1) {
    // Yesterday's news - recent events
    query = `${locationName} news headlines yesterday`;
  } else if (daysDiff === 1) {
    // Tomorrow (future) - upcoming events
    query = `${locationName} upcoming events tomorrow`;
  } else if (daysDiff >= -7 && daysDiff < 0) {
    // Past week - specific date news
    query = `${locationName} news ${formattedDate} headlines`;
  } else if (daysDiff > 1 && daysDiff <= 7) {
    // Next week - future events
    query = `${locationName} events ${formattedDate}`;
  } else {
    // Older/further news - date-specific query
    query = `${locationName} news ${formattedDate}`;
  }

  console.log(`DEBUG: Generated query for date ${date} (timezone ${timezone}, country ${country}, days diff: ${daysDiff}): "${query}"`);

  return query;
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