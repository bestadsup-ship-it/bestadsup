// OAuth Configuration for Third-Party Services
// Add credentials to .env when ready to enable real OAuth

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

// Google Analytics 4 OAuth Configuration
export const googleAnalyticsConfig: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/verification/oauth/callback/ga4',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
  ],
};

// HubSpot OAuth Configuration
export const hubspotConfig: OAuthConfig = {
  clientId: process.env.HUBSPOT_CLIENT_ID || '',
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
  redirectUri: process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3002/verification/oauth/callback/hubspot',
  authUrl: 'https://app.hubspot.com/oauth/authorize',
  tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
  scopes: [
    'analytics.read',
    'crm.objects.contacts.read',
  ],
};

// Stripe OAuth Configuration
export const stripeConfig: OAuthConfig = {
  clientId: process.env.STRIPE_CONNECT_CLIENT_ID || '',
  clientSecret: process.env.STRIPE_SECRET_KEY || '',
  redirectUri: process.env.STRIPE_REDIRECT_URI || 'http://localhost:3002/verification/oauth/callback/stripe',
  authUrl: 'https://connect.stripe.com/oauth/authorize',
  tokenUrl: 'https://connect.stripe.com/oauth/token',
  scopes: ['read_only'],
};

export function getOAuthConfig(serviceName: string): OAuthConfig | null {
  switch (serviceName) {
    case 'ga4':
      return googleAnalyticsConfig;
    case 'hubspot':
      return hubspotConfig;
    case 'stripe':
      return stripeConfig;
    default:
      return null;
  }
}

export function isOAuthConfigured(serviceName: string): boolean {
  const config = getOAuthConfig(serviceName);
  return !!(config && config.clientId && config.clientSecret);
}

export function buildAuthorizationUrl(serviceName: string, state: string): string | null {
  const config = getOAuthConfig(serviceName);
  if (!config || !config.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline', // For refresh tokens (Google/HubSpot)
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return `${config.authUrl}?${params.toString()}`;
}
