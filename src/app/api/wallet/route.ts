import { NextResponse } from 'next/server';
import { checkWalletStatus, fundWalletInstructions } from '@/lib/services/walletService';

export async function GET() {
  // Only allow in development or with admin access
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'Wallet endpoints only available in development'
    }, { status: 403 });
  }

  try {
    console.log('Checking wallet status...');
    
    const walletStatus = await checkWalletStatus();
    const fundingInstructions = await fundWalletInstructions();
    
    return NextResponse.json({
      success: true,
      data: {
        wallet: walletStatus,
        fundingInstructions: walletStatus.success ? null : fundingInstructions
      }
    });
    
  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}