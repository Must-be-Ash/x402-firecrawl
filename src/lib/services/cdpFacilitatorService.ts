import jwt from 'jsonwebtoken';
import { x402Config } from '@/config/x402';

interface PaymentKind {
  scheme: string;
  network: string;
}

interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: unknown;
}

interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: unknown;
}

interface CDPFacilitator {
  supportedPaymentKinds: () => Promise<PaymentKind[]>;
  verifyPayment: (paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) => Promise<{ isValid: boolean; invalidReason?: string }>;
  settlePayment: (paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) => Promise<{ success: boolean; error?: string; txHash?: string; networkId?: string }>;
}

function generateJWT(apiKeyId: string, apiKeySecret: string): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: apiKeyId
  };

  const payload = {
    iss: 'cdp',
    sub: apiKeyId,
    aud: ['https://api.cdp.coinbase.com'],
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000)
  };

  try {
    return jwt.sign(payload, apiKeySecret, { 
      header,
      algorithm: 'RS256' 
    });
  } catch (error) {
    console.error('Failed to generate JWT:', error);
    throw new Error('Failed to generate authentication token');
  }
}

export function createCDPFacilitator(): CDPFacilitator | null {
  const { apiKeyId, apiKeySecret } = x402Config.cdp;
  
  if (!apiKeyId || !apiKeySecret) {
    console.log('CDP API credentials not configured, using default facilitator');
    return null;
  }

  const baseURL = 'https://api.cdp.coinbase.com/platform';

  async function makeAuthenticatedRequest(endpoint: string, method: string = 'GET', body?: unknown) {
    try {
      if (!apiKeyId || !apiKeySecret) {
        throw new Error('CDP API credentials are required');
      }
      const token = generateJWT(apiKeyId, apiKeySecret);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'news-app/1.0.0'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CDP API error (${response.status}):`, errorText);
        throw new Error(`CDP API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`CDP API request failed:`, error);
      throw error;
    }
  }

  return {
    async supportedPaymentKinds() {
      console.log('Fetching supported payment kinds from CDP facilitator...');
      return await makeAuthenticatedRequest('/v2/x402/supported');
    },

    async verifyPayment(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) {
      console.log('Verifying payment with CDP facilitator...');
      const body = {
        x402Version: 1,
        paymentPayload,
        paymentRequirements
      };
      return await makeAuthenticatedRequest('/v2/x402/verify', 'POST', body);
    },

    async settlePayment(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) {
      console.log('Settling payment with CDP facilitator...');
      const body = {
        x402Version: 1,
        paymentPayload,
        paymentRequirements
      };
      return await makeAuthenticatedRequest('/v2/x402/settle', 'POST', body);
    }
  };
}

export async function testCDPFacilitator(): Promise<{ success: boolean; message: string }> {
  try {
    const facilitator = createCDPFacilitator();
    
    if (!facilitator) {
      return {
        success: false,
        message: 'CDP facilitator not configured (missing API keys)'
      };
    }

    // Test by fetching supported payment kinds
    const supported = await facilitator.supportedPaymentKinds();
    
    return {
      success: true,
      message: `CDP facilitator working. Supports ${Array.isArray(supported) ? supported.length : 0} payment kinds: ${Array.isArray(supported) ? supported.map((k: PaymentKind) => `${k.scheme}/${k.network}`).join(', ') : 'none'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `CDP facilitator test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}