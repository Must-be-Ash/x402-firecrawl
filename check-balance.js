import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Minimal USDC ABI for balance check
const usdcAbi = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  }
];

async function checkUSDCBalance() {
  try {
    const account = privateKeyToAccount(privateKey);
    console.log('Wallet Address:', account.address);
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    console.log('Checking USDC balance on Base...');
    
    // Get balance
    const balance = await publicClient.readContract({
      address: usdcAddress,
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    // Get decimals
    const decimals = await publicClient.readContract({
      address: usdcAddress,
      abi: usdcAbi,  
      functionName: 'decimals'
    });
    
    const balanceFormatted = Number(balance) / Math.pow(10, decimals);
    const requiredAmount = 0.01; // $0.01 USDC
    
    console.log('\n💰 BALANCE CHECK RESULTS');
    console.log('========================');
    console.log('USDC Balance:', balanceFormatted.toFixed(6), 'USDC');
    console.log('Required Amount:', requiredAmount, 'USDC'); 
    console.log('Sufficient Funds:', balanceFormatted >= requiredAmount ? '✅ YES' : '❌ NO');
    
    if (balanceFormatted < requiredAmount) {
      console.log('\n🚨 INSUFFICIENT FUNDS!');
      console.log('You need at least', requiredAmount, 'USDC but only have', balanceFormatted.toFixed(6), 'USDC');
      console.log('Please fund your wallet with USDC on Base network');
    } else {
      console.log('\n✅ FUNDS ARE SUFFICIENT');
      console.log('The payment issue is not related to insufficient balance');
    }
    
  } catch (error) {
    console.error('❌ Failed to check balance:', error.message);
  }
}

checkUSDCBalance();