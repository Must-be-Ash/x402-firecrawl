import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { wrapFetchWithPayment } from "x402-fetch";

async function searchNewsWithX402Fetch(query: string, options?: {
  limit?: number;
}) {
  const privateKey = 'MY-WALLET-PRIVATE-KEY';
  
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
  
  const searchOptions = {
    query,
    limit: Math.min(options?.limit || 10, 10)
  };
  
  console.log('Searching with x402-fetch for query:', query);

  const response = await fetchWithPayment('https://api.firecrawl.dev/v1/x402/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer MY-API-KEY`,
    },
    body: JSON.stringify(searchOptions)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firecrawl API error:', response.status, errorText);
    throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('🎉 x402-fetch payment and search successful!');
  console.log('Articles found:', result);

  return result;
}


searchNewsWithX402Fetch('Who discovered Brazil?');