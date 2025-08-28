import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { createPaymentHeader } from "x402/client";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

console.log('🔍 Debugging USDC Authorization for x402 Payment');
console.log('=====================================');

try {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  console.log('✅ Wallet Setup:');
  console.log('  Address:', account.address);
  console.log('  Chain ID:', base.id);
  console.log('  Chain Name:', base.name);
  console.log('  USDC Contract:', usdcContractAddress);

  // Mock payment requirements from Firecrawl
  const paymentRequirements = {
    scheme: "exact",
    network: "base", 
    maxAmountRequired: "10000", // $0.01 USDC
    payTo: "0xAb4FB7151E7e2B9EC99E9CE1Bc2d5288fBa15F52", // Firecrawl's address
    maxTimeoutSeconds: 120,
    asset: usdcContractAddress, // Base USDC contract
    extra: {
      name: "USD Coin",
      version: "2"
    }
  };

  console.log('\n💰 Payment Requirements:');
  console.log('  Scheme:', paymentRequirements.scheme);
  console.log('  Network:', paymentRequirements.network);
  console.log('  Amount:', paymentRequirements.maxAmountRequired, 'units ($0.01)');
  console.log('  Pay To:', paymentRequirements.payTo);
  console.log('  Asset Contract:', paymentRequirements.asset);
  console.log('  USDC Version:', paymentRequirements.extra.version);

  console.log('\n🔐 Creating Authorization Signature...');
  
  // Create payment header and log detailed info
  const paymentHeader = await createPaymentHeader(
    walletClient,
    1, // x402Version
    paymentRequirements
  );

  console.log('✅ Payment header created successfully');
  
  // Decode and analyze the payment header
  const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
  
  console.log('\n📋 Authorization Details:');
  console.log('  x402Version:', decoded.x402Version);
  console.log('  Scheme:', decoded.scheme);
  console.log('  Network:', decoded.network);
  console.log('  From Address:', decoded.payload.authorization.from);
  console.log('  To Address:', decoded.payload.authorization.to);
  console.log('  Value:', decoded.payload.authorization.value, 'units');
  console.log('  Valid After:', new Date(parseInt(decoded.payload.authorization.validAfter) * 1000).toISOString());
  console.log('  Valid Before:', new Date(parseInt(decoded.payload.authorization.validBefore) * 1000).toISOString());
  console.log('  Nonce:', decoded.payload.authorization.nonce);
  
  console.log('\n🔏 Signature Analysis:');
  console.log('  Signature Present:', !!decoded.payload.signature);
  console.log('  Signature Length:', decoded.payload.signature?.length || 'N/A');
  console.log('  Signature Format:', decoded.payload.signature?.startsWith('0x') ? 'Valid hex' : 'Invalid format');
  
  // Validate signature components
  if (decoded.payload.signature?.length === 132) { // 0x + 64 bytes * 2 = 132 chars
    console.log('  ✅ Signature length is correct (132 chars)');
  } else {
    console.log('  ❌ Signature length is incorrect');
  }

  // Check domain parameters for EIP-712
  console.log('\n🏗️  EIP-712 Domain Check:');
  console.log('  Contract Address matches USDC?', paymentRequirements.asset === usdcContractAddress ? '✅' : '❌');
  console.log('  Network matches Base?', paymentRequirements.network === 'base' ? '✅' : '❌');
  console.log('  Chain ID is Base (8453)?', base.id === 8453 ? '✅' : '❌');

  // Test timing validation
  const now = Math.floor(Date.now() / 1000);
  const validAfter = parseInt(decoded.payload.authorization.validAfter);
  const validBefore = parseInt(decoded.payload.authorization.validBefore);
  
  console.log('\n⏰ Timing Validation:');
  console.log('  Current Time:', new Date(now * 1000).toISOString());
  console.log('  Valid After:', validAfter <= now ? '✅' : '❌');
  console.log('  Valid Before:', validBefore > now ? '✅' : '❌');
  console.log('  Time Window:', Math.floor((validBefore - validAfter) / 60), 'minutes');

  // Final validation
  console.log('\n🎯 Authorization Validation Summary:');
  const validations = [
    { name: 'Signature Present', valid: !!decoded.payload.signature },
    { name: 'Signature Length', valid: decoded.payload.signature?.length === 132 },
    { name: 'From Address Match', valid: decoded.payload.authorization.from.toLowerCase() === account.address.toLowerCase() },
    { name: 'To Address Match', valid: decoded.payload.authorization.to.toLowerCase() === paymentRequirements.payTo.toLowerCase() },
    { name: 'Value Match', valid: decoded.payload.authorization.value === paymentRequirements.maxAmountRequired },
    { name: 'Contract Address', valid: paymentRequirements.asset === usdcContractAddress },
    { name: 'Network', valid: paymentRequirements.network === 'base' },
    { name: 'Timing Valid', valid: validAfter <= now && validBefore > now }
  ];

  validations.forEach(v => {
    console.log(`  ${v.valid ? '✅' : '❌'} ${v.name}`);
  });

  const allValid = validations.every(v => v.valid);
  console.log(`\n${allValid ? '🎉' : '⚠️'} Overall Authorization: ${allValid ? 'VALID' : 'ISSUES FOUND'}`);

  if (!allValid) {
    console.log('\n🔧 Potential Issues:');
    validations.filter(v => !v.valid).forEach(v => {
      console.log(`  - ${v.name} failed validation`);
    });
  }

} catch (error) {
  console.error('\n💥 Authorization Test Failed:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  
  // Check for common issues
  if (error.message.includes('insufficient funds')) {
    console.log('\n💡 Suggestion: Check USDC balance and ETH for gas');
  } else if (error.message.includes('signature')) {
    console.log('\n💡 Suggestion: Check EIP-712 signature parameters');
  } else if (error.message.includes('network')) {
    console.log('\n💡 Suggestion: Verify Base network configuration');
  }
}