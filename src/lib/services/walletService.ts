import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { x402Config } from '@/config/x402';

// USDC contract addresses
const USDC_ADDRESSES = {
  'base': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
} as const;

// ERC-20 ABI for balance checking
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

export async function checkWalletStatus(): Promise<{
  success: boolean;
  address?: string;
  testnet?: {
    nativeBalance: string;
    usdcBalance: string;
    hasEnoughETH: boolean;
    hasEnoughUSDC: boolean;
  };
  mainnet?: {
    nativeBalance: string;
    usdcBalance: string;
    hasEnoughETH: boolean;
    hasEnoughUSDC: boolean;
  };
  message: string;
}> {
  try {
    if (!x402Config.payment.privateKey) {
      return {
        success: false,
        message: 'No private key configured'
      };
    }

    // Create account from private key
    const account = privateKeyToAccount(x402Config.payment.privateKey as `0x${string}`);
    
    console.log('Checking wallet status on both testnet and mainnet:', account.address);

    // Check both testnet and mainnet
    const [testnetStatus, mainnetStatus] = await Promise.allSettled([
      checkNetworkBalance(account.address, 'base-sepolia'),
      checkNetworkBalance(account.address, 'base')
    ]);

    const testnet = testnetStatus.status === 'fulfilled' ? testnetStatus.value : null;
    const mainnet = mainnetStatus.status === 'fulfilled' ? mainnetStatus.value : null;

    // Overall success depends on having funds on the required networks
    const testnetReady = testnet?.hasEnoughETH && testnet?.hasEnoughUSDC;
    const mainnetReady = mainnet?.hasEnoughETH && mainnet?.hasEnoughUSDC;

    let message = `Wallet ${account.address}:\n`;
    
    if (testnet) {
      message += `🟡 Base Sepolia: ETH=${testnet.nativeBalance}, USDC=${testnet.usdcBalance}`;
      message += testnetReady ? ' ✅' : ' ⚠️';
      message += '\n';
    }
    
    if (mainnet) {
      message += `🔵 Base Mainnet: ETH=${mainnet.nativeBalance}, USDC=${mainnet.usdcBalance}`;
      message += mainnetReady ? ' ✅' : ' ⚠️';
      message += '\n';
    }

    message += '\n📋 Requirements:';
    message += '\n• Testnet: For development/testing';
    message += '\n• Mainnet: For Firecrawl API calls (REQUIRED)';

    return {
      success: mainnetReady || false, // Success only if mainnet is ready (Firecrawl requirement)
      address: account.address,
      testnet: testnet || undefined,
      mainnet: mainnet || undefined,
      message: message.trim()
    };

  } catch (error) {
    console.error('Failed to check wallet status:', error);
    return {
      success: false,
      message: `Failed to check wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function checkNetworkBalance(address: `0x${string}`, network: 'base' | 'base-sepolia') {
  const chain = network === 'base' ? base : baseSepolia;
  const usdcAddress = USDC_ADDRESSES[network] as `0x${string}`;
  
  const client = createPublicClient({
    chain,
    transport: http()
  });

  // Get native token balance (ETH)
  const nativeBalance = await client.getBalance({ address });
  
  // Get USDC balance
  const usdcBalance = await client.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // Get USDC decimals for proper formatting
  const decimals = await client.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    args: [],
  });

  const nativeBalanceFormatted = formatUnits(nativeBalance, 18);
  const usdcBalanceFormatted = formatUnits(usdcBalance as bigint, decimals as number);

  const hasEnoughUSDC = (usdcBalance as bigint) >= parseUnits('0.01', decimals as number);
  const hasEnoughETH = nativeBalance >= parseUnits('0.001', 18);

  return {
    nativeBalance: nativeBalanceFormatted,
    usdcBalance: usdcBalanceFormatted,
    hasEnoughETH,
    hasEnoughUSDC
  };
}

export async function fundWalletInstructions(): Promise<string> {
  const account = x402Config.payment.privateKey 
    ? privateKeyToAccount(x402Config.payment.privateKey as `0x${string}`)
    : null;

  if (!account) {
    return 'No wallet configured';
  }

  return `
# Wallet Funding Instructions

Your wallet address: **${account.address}**

## 🟡 Base Sepolia Testnet (Development/Testing)

1. **Get testnet ETH for gas:**
   - Visit: https://www.alchemy.com/faucets/base-sepolia
   - Enter your address: ${account.address}
   - Request testnet ETH

2. **Get testnet USDC:**
   - Visit: https://faucet.circle.com/
   - Connect your wallet
   - Request testnet USDC on Base Sepolia

3. **Alternative USDC faucet:**
   - Visit: https://bridge.base.org/
   - Bridge some testnet tokens

**Requirements:** ~0.001 ETH for gas, ~0.01 USDC for testing

## 🔵 Base Mainnet (Production - Required for Firecrawl)

⚠️ **MAINNET REQUIRED: Firecrawl only accepts real USDC on Base mainnet**

1. **Transfer ETH and USDC to your wallet:**
   - Network: Base (Chain ID: 8453)
   - Required: ~0.001 ETH for gas, ~0.01+ USDC for API calls

2. **Buy crypto on an exchange:**
   - Coinbase, Binance, etc.
   - Withdraw to Base network

3. **Use a bridge:**
   - Bridge ETH/USDC from Ethereum mainnet
   - Visit: https://bridge.base.org/

⚠️ **This is mainnet - use real funds carefully!**

## Important Notes

- **Testnet funds**: Free but only for testing non-Firecrawl features
- **Mainnet funds**: Required for Firecrawl API calls (real money)
- The app will automatically use mainnet for Firecrawl payments
  `.trim();
}