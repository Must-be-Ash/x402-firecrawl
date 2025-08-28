import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const privateKey = process.env.X402_PRIVATE_KEY;
console.log('Environment check:');
console.log('Private key configured:', !!privateKey);
console.log('Private key format:', privateKey ? (privateKey.startsWith('0x') ? 'Correct (0x...)' : 'Missing 0x prefix') : 'Not found');

if (privateKey) {
  try {
    const account = privateKeyToAccount(privateKey);
    console.log('Account address:', account.address);
    console.log('Account creation: SUCCESS');
  } catch (error) {
    console.log('Account creation: FAILED', error.message);
  }
} else {
  console.log('❌ X402_PRIVATE_KEY not found in environment');
}
