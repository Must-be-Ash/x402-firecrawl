import { NextResponse } from 'next/server';
import { resetCircuitBreaker } from '@/lib/services/x402Service';

export async function POST() {
  try {
    resetCircuitBreaker();
    return NextResponse.json({ 
      success: true, 
      message: 'Circuit breaker reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset circuit breaker' },
      { status: 500 }
    );
  }
}
