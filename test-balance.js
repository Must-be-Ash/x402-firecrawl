import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from "viem/accounts";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

if (!privateKey) {
  console.error('❌ X402_PRIVATE_KEY not found');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
console.log('🔍 Checking wallet:', account.address);

// Create public client to check balances
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

try {
  // Check ETH balance for gas
  console.log('\n💰 Checking ETH balance...');
  const ethBalance = await publicClient.getBalance({
    address: account.address
  });
  const ethBalanceFormatted = Number(ethBalance) / 1e18;
  console.log('ETH Balance:', ethBalanceFormatted.toFixed(6), 'ETH');
  
  // Check USDC balance
  console.log('\n💵 Checking USDC balance...');
  const usdcBalance = await publicClient.readContract({
    address: usdcContractAddress,
    abi: [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function'
      }
    ],
    functionName: 'balanceOf',
    args: [account.address]
  });
  
  const usdcBalanceFormatted = Number(usdcBalance) / 1e6;
  console.log('USDC Balance:', usdcBalanceFormatted.toFixed(6), 'USDC');
  
  // Check if we have enough for the payment
  const requiredUsdc = 10000 / 1e6; // 0.01 USDC
  console.log('\n🔍 Payment requirements:');
  console.log('Required USDC:', requiredUsdc.toFixed(6), 'USDC');
  console.log('Available USDC:', usdcBalanceFormatted.toFixed(6), 'USDC');
  console.log('Sufficient USDC?', usdcBalanceFormatted >= requiredUsdc ? '✅ Yes' : '❌ No');
  console.log('Sufficient ETH for gas?', ethBalanceFormatted > 0.001 ? '✅ Yes' : '❌ No');
  
} catch (error) {
  console.error('❌ Error checking balances:', error.message);
}