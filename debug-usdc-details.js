import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const firecrawlRecipient = '0xAb4FB7151E7e2B9EC99E9CE1Bc2d5288fBa15F52';

// Extended USDC ABI including EIP-3009 functions
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
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "version",
    outputs: [{ name: "", type: "string" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "authorizer", type: "address" }, { name: "nonce", type: "bytes32" }],
    name: "authorizationState",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }, { name: "_spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  }
];

async function debugUSDCDetails() {
  try {
    const account = privateKeyToAccount(privateKey);
    console.log('🔍 Debugging USDC Contract Details');
    console.log('==================================');
    console.log('Wallet Address:', account.address);
    console.log('USDC Contract:', usdcAddress);
    console.log('Firecrawl Recipient:', firecrawlRecipient);
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    console.log('\n📊 USDC Contract Information:');
    
    // Get basic token info
    const [balance, decimals, name, version] = await Promise.all([
      publicClient.readContract({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: 'balanceOf',
        args: [account.address]
      }),
      publicClient.readContract({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: 'decimals'
      }),
      publicClient.readContract({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: 'name'
      }),
      publicClient.readContract({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: 'version'
      })
    ]);
    
    const balanceFormatted = Number(balance) / Math.pow(10, decimals);
    
    console.log('- Name:', name);
    console.log('- Version:', version);
    console.log('- Decimals:', decimals);
    console.log('- Balance:', balanceFormatted.toFixed(6), 'USDC');
    console.log('- Raw Balance:', balance.toString());
    
    // Check if we have enough for the payment
    const requiredAmount = BigInt(10000); // 0.01 USDC
    const hasEnough = balance >= requiredAmount;
    console.log('- Required Amount:', requiredAmount.toString(), '(0.01 USDC)');
    console.log('- Sufficient Balance:', hasEnough ? '✅ YES' : '❌ NO');
    
    // Check allowance (shouldn't be needed for EIP-3009 but let's verify)
    const allowance = await publicClient.readContract({
      address: usdcAddress,
      abi: usdcAbi,
      functionName: 'allowance',
      args: [account.address, firecrawlRecipient]
    });
    
    console.log('- Allowance to Firecrawl:', allowance.toString(), '(should not be needed for EIP-3009)');
    
    // Test a sample nonce state (this should return false for unused nonces)
    const testNonce = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const nonceUsed = await publicClient.readContract({
      address: usdcAddress,
      abi: usdcAbi,
      functionName: 'authorizationState',
      args: [account.address, testNonce]
    });
    
    console.log('- Test nonce used:', nonceUsed, '(should be false)');
    
    console.log('\n💡 Analysis:');
    if (!hasEnough) {
      console.log('❌ Insufficient USDC balance for payment');
    } else if (balance > requiredAmount * BigInt(1000)) {
      console.log('✅ Balance is significantly above required amount');
    } else {
      console.log('⚠️  Balance is sufficient but close to required amount');
    }
    
    console.log('\n🔧 EIP-712 Domain Verification:');
    console.log('Expected for signature:');
    console.log({
      name,
      version,
      chainId: base.id,
      verifyingContract: usdcAddress,
    });
    
  } catch (error) {
    console.error('❌ Failed to check USDC details:', error.message);
  }
}

debugUSDCDetails();
