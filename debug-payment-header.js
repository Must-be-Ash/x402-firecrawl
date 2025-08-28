import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from "viem/accounts";
import { base } from 'viem/chains';
import { createPaymentHeader } from "x402/client";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http()
});

// Mock payment requirements from Firecrawl
const mockPaymentRequirements = {
  scheme: "exact",
  network: "base", 
  maxAmountRequired: "10000",
  payTo: "0xAb4FB7151E7e2B9EC99E9CE1Bc2d5288fBa15F52",
  maxTimeoutSeconds: 120,
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
};

console.log('🔍 Debugging payment header creation...');
console.log('Wallet address:', account.address);
console.log('Chain ID:', base.id);
console.log('Payment requirements:', JSON.stringify(mockPaymentRequirements, null, 2));

try {
  const paymentHeader = await createPaymentHeader(
    walletClient,
    1, // x402Version
    mockPaymentRequirements
  );
  
  console.log('\n✅ Payment header created:', paymentHeader);
  
  // Decode the base64 payment header
  const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
  console.log('\n📋 Decoded payment header:');
  console.log(JSON.stringify(decoded, null, 2));
  
  // Verify the signature fields
  console.log('\n🔐 Signature verification:');
  console.log('Has signature:', !!decoded.payload.signature);
  console.log('Signature length:', decoded.payload.signature ? decoded.payload.signature.length : 'N/A');
  console.log('From address:', decoded.payload.authorization.from);
  console.log('To address:', decoded.payload.authorization.to);
  console.log('Value:', decoded.payload.authorization.value);
  console.log('Valid after:', new Date(parseInt(decoded.payload.authorization.validAfter) * 1000).toISOString());
  console.log('Valid before:', new Date(parseInt(decoded.payload.authorization.validBefore) * 1000).toISOString());
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}