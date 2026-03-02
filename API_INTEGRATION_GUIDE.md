# API Integration Guide
## BestAdsUp - Third-Party Verification Integration

**Last Updated:** February 28, 2026
**Integrations:** Google Analytics 4, HubSpot, Stripe Connect

---

## Table of Contents
1. [Overview](#overview)
2. [Google Analytics 4 Integration](#google-analytics-4-integration)
3. [HubSpot Integration](#hubspot-integration)
4. [Stripe Connect Integration](#stripe-connect-integration)
5. [Testing with Sandbox Accounts](#testing-with-sandbox-accounts)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

### Purpose
BestAdsUp verifies marketing results by connecting to third-party platforms via OAuth. This ensures all metrics displayed are **real and verified**, not self-reported.

### Integration Flow
```
Creator clicks "Connect GA4"
    ↓
Redirect to Google OAuth consent screen
    ↓
User authorizes access to Analytics data
    ↓
Google redirects back with authorization code
    ↓
Exchange code for access_token + refresh_token
    ↓
Store tokens in verification_connections table
    ↓
Fetch verified metrics via API
    ↓
Store in verification_data table
    ↓
Auto-grant badges if >= 3 verified metrics
```

---

## Google Analytics 4 Integration

### Purpose
Verify traffic, conversions, and engagement metrics from creators' GA4 properties.

### 1. Setup Google Cloud Project

#### Create Project:
```bash
# Visit: https://console.cloud.google.com

1. Click "Create Project"
2. Name: "BestAdsUp Verification"
3. Click "Create"
```

#### Enable APIs:
```bash
1. Go to "APIs & Services" → "Library"
2. Search "Google Analytics Data API"
3. Click "Enable"
```

#### Create OAuth 2.0 Credentials:
```bash
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "BestAdsUp GA4 Verification"
5. Authorized redirect URIs:
   - Development: http://localhost:3005/verification/callback
   - Production: https://app.bestadsup.com/verification/callback
6. Click "Create"
7. Save Client ID and Client Secret to .env
```

---

### 2. OAuth Flow Implementation

#### Backend Endpoint: Initiate OAuth
```typescript
// POST /api/v1/verification/connect-ga4
import { google } from 'googleapis';

export async function connectGA4(req, res) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI  // http://localhost:3005/verification/callback
  );

  const scopes = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Get refresh token
    scope: scopes,
    prompt: 'consent',  // Force consent to get refresh token
    state: JSON.stringify({
      user_id: req.user.id,
      provider: 'google_analytics_4'
    })
  });

  return res.json({ authorization_url: authUrl });
}
```

#### Backend Endpoint: Handle Callback
```typescript
// GET /api/v1/verification/callback
export async function verificationCallback(req, res) {
  const { code, state } = req.query;
  const { user_id, provider } = JSON.parse(state);

  // Exchange authorization code for tokens
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Store in database
  await db.query(`
    INSERT INTO verification_connections (
      account_id, provider, access_token, refresh_token, token_expires_at, scopes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (account_id, provider)
    DO UPDATE SET
      access_token = $3,
      refresh_token = $4,
      token_expires_at = $5,
      last_synced_at = CURRENT_TIMESTAMP,
      connection_status = 'active'
  `, [
    user_id,
    'google_analytics_4',
    encrypt(tokens.access_token),  // Encrypt in production
    encrypt(tokens.refresh_token),
    new Date(tokens.expiry_date),
    ['analytics.readonly', 'userinfo.email', 'userinfo.profile']
  ]);

  // Redirect to dashboard
  return res.redirect('/dashboard?connected=ga4');
}
```

---

### 3. Fetch Metrics from GA4

#### List Available Properties:
```typescript
// GET /api/v1/verification/ga4/properties
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function listGA4Properties(req, res) {
  const connection = await getConnection(req.user.id, 'google_analytics_4');

  const analyticsAdmin = google.analyticsadmin('v1beta');
  analyticsAdmin.context._options.auth = createOAuth2Client(connection);

  const response = await analyticsAdmin.properties.list();

  return res.json({
    properties: response.data.properties.map(p => ({
      id: p.name.split('/')[1],  // Extract property ID
      display_name: p.displayName,
      create_time: p.createTime
    }))
  });
}
```

#### Fetch Traffic Metrics:
```typescript
// POST /api/v1/verification/ga4/metrics
export async function fetchGA4Metrics(req, res) {
  const { property_id, date_range } = req.body;
  const connection = await getConnection(req.user.id, 'google_analytics_4');

  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      access_token: decrypt(connection.access_token)
    }
  });

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${property_id}`,
    dateRanges: [
      {
        startDate: date_range.start || '30daysAgo',
        endDate: date_range.end || 'today'
      }
    ],
    dimensions: [
      { name: 'date' }
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'conversions' },
      { name: 'engagementRate' }
    ]
  });

  // Calculate totals and changes
  const metrics = {
    total_users: sumMetric(response.rows, 'activeUsers'),
    total_sessions: sumMetric(response.rows, 'sessions'),
    total_conversions: sumMetric(response.rows, 'conversions'),
    avg_engagement_rate: avgMetric(response.rows, 'engagementRate')
  };

  // Store in verification_data table
  await db.query(`
    INSERT INTO verification_data (
      account_id, connection_id, source, metric_type, metric_name,
      metric_value, date_range_start, date_range_end,
      is_verified, verified_at, api_response_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), $9)
  `, [
    req.user.id,
    connection.id,
    'google_analytics_4',
    'traffic',
    'Organic Traffic',
    metrics.total_users,
    date_range.start,
    date_range.end,
    JSON.stringify(response)  // Store full response for transparency
  ]);

  return res.json({ metrics, verified: true });
}
```

---

### 4. Refresh Token Strategy

```typescript
// utils/oauth.ts
export async function refreshGA4Token(connection_id) {
  const connection = await db.query(
    'SELECT * FROM verification_connections WHERE id = $1',
    [connection_id]
  );

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: decrypt(connection.refresh_token)
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  // Update database
  await db.query(`
    UPDATE verification_connections
    SET access_token = $1,
        token_expires_at = $2,
        updated_at = NOW()
    WHERE id = $3
  `, [
    encrypt(credentials.access_token),
    new Date(credentials.expiry_date),
    connection_id
  ]);

  return credentials.access_token;
}
```

---

## HubSpot Integration

### Purpose
Verify lead generation, contact growth, and marketing email performance.

### 1. Setup HubSpot App

#### Create App:
```bash
# Visit: https://developers.hubspot.com

1. Click "Create app"
2. Name: "BestAdsUp Verification"
3. Description: "Verify marketing results for BestAdsUp marketplace"
```

#### Configure OAuth:
```bash
1. Go to "Auth" tab
2. Redirect URL: http://localhost:3005/verification/hubspot/callback
3. Scopes (select these):
   - contacts (read)
   - forms (read)
   - analytics.read
4. Save Client ID and Client Secret to .env
```

---

### 2. OAuth Flow

#### Backend Endpoint: Initiate OAuth
```typescript
// POST /api/v1/verification/connect-hubspot
export async function connectHubSpot(req, res) {
  const authUrl = `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${process.env.HUBSPOT_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.HUBSPOT_REDIRECT_URI)}` +
    `&scope=contacts%20forms%20analytics.read` +
    `&state=${JSON.stringify({ user_id: req.user.id, provider: 'hubspot' })}`;

  return res.json({ authorization_url: authUrl });
}
```

#### Backend Endpoint: Handle Callback
```typescript
// GET /api/v1/verification/hubspot/callback
export async function hubspotCallback(req, res) {
  const { code, state } = req.query;
  const { user_id } = JSON.parse(state);

  // Exchange code for tokens
  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
      code
    })
  });

  const tokens = await response.json();

  // Store in database
  await db.query(`
    INSERT INTO verification_connections (
      account_id, provider, access_token, refresh_token, token_expires_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (account_id, provider) DO UPDATE
    SET access_token = $3, refresh_token = $4, token_expires_at = $5
  `, [
    user_id,
    'hubspot',
    encrypt(tokens.access_token),
    encrypt(tokens.refresh_token),
    new Date(Date.now() + tokens.expires_in * 1000)
  ]);

  return res.redirect('/dashboard?connected=hubspot');
}
```

---

### 3. Fetch HubSpot Metrics

#### Get Contact Growth:
```typescript
// POST /api/v1/verification/hubspot/metrics
export async function fetchHubSpotMetrics(req, res) {
  const { date_range } = req.body;
  const connection = await getConnection(req.user.id, 'hubspot');

  // Get contacts created in date range
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts?` +
    `limit=100&` +
    `properties=createdate&` +
    `filterGroups=${JSON.stringify([{
      filters: [{
        propertyName: 'createdate',
        operator: 'BETWEEN',
        value: date_range.start,
        highValue: date_range.end
      }]
    }])}`,
    {
      headers: {
        'Authorization': `Bearer ${decrypt(connection.access_token)}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  // Store metric
  await db.query(`
    INSERT INTO verification_data (
      account_id, connection_id, source, metric_type, metric_name,
      metric_value, date_range_start, date_range_end,
      is_verified, verified_at, api_response_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), $9)
  `, [
    req.user.id,
    connection.id,
    'hubspot',
    'leads',
    'New Contacts',
    data.total,
    date_range.start,
    date_range.end,
    JSON.stringify(data)
  ]);

  return res.json({
    metric: 'New Contacts',
    value: data.total,
    verified: true
  });
}
```

---

## Stripe Connect Integration

### Purpose
Verify revenue, MRR (Monthly Recurring Revenue), and transaction volume for SaaS creators.

### 1. Setup Stripe Connect

#### Enable Connect in Dashboard:
```bash
# Visit: https://dashboard.stripe.com/settings/connect

1. Click "Get started with Connect"
2. Select "Express" account type
3. Configure branding (BestAdsUp logo, colors)
4. Save
```

#### Get API Keys:
```bash
# Development: https://dashboard.stripe.com/test/apikeys
# Production: https://dashboard.stripe.com/apikeys

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### 2. Connect Account Creation

#### Backend Endpoint: Create Connect Account
```typescript
// POST /api/v1/verification/connect-stripe
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createStripeConnectAccount(req, res) {
  const { user } = req;

  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    country: user.country || 'US',
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_type: 'individual',
    metadata: {
      bestadsup_user_id: user.id,
      account_type: 'creator'
    }
  });

  // Store in database
  await db.query(`
    INSERT INTO escrow_accounts (
      account_id, stripe_account_id, account_type, status
    ) VALUES ($1, $2, $3, $4)
  `, [user.id, account.id, 'express', 'pending']);

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.FRONTEND_URL}/verification/stripe/refresh`,
    return_url: `${process.env.FRONTEND_URL}/verification/stripe/return`,
    type: 'account_onboarding'
  });

  return res.json({
    stripe_account_id: account.id,
    onboarding_url: accountLink.url
  });
}
```

#### Handle Onboarding Return:
```typescript
// GET /api/v1/verification/stripe/return
export async function stripeOnboardingReturn(req, res) {
  const escrowAccount = await db.query(
    'SELECT * FROM escrow_accounts WHERE account_id = $1',
    [req.user.id]
  );

  // Check account status
  const account = await stripe.accounts.retrieve(escrowAccount.stripe_account_id);

  // Update database
  await db.query(`
    UPDATE escrow_accounts
    SET onboarding_completed = $1,
        charges_enabled = $2,
        payouts_enabled = $3,
        status = $4,
        has_bank_account = $5
    WHERE id = $6
  `, [
    account.details_submitted,
    account.charges_enabled,
    account.payouts_enabled,
    account.charges_enabled ? 'active' : 'restricted',
    account.external_accounts?.data.length > 0,
    escrowAccount.id
  ]);

  // Store as verification connection
  await db.query(`
    INSERT INTO verification_connections (
      account_id, provider, provider_account_id, is_active, connection_status
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (account_id, provider) DO UPDATE
    SET provider_account_id = $3, is_active = $4, connection_status = $5
  `, [
    req.user.id,
    'stripe',
    account.id,
    account.charges_enabled,
    account.charges_enabled ? 'active' : 'pending'
  ]);

  return res.redirect('/dashboard?stripe_connected=true');
}
```

---

### 3. Fetch Stripe Revenue Metrics

```typescript
// POST /api/v1/verification/stripe/metrics
export async function fetchStripeMetrics(req, res) {
  const { date_range } = req.body;
  const escrowAccount = await getEscrowAccount(req.user.id);

  // Fetch charges from connected account
  const charges = await stripe.charges.list({
    created: {
      gte: Math.floor(new Date(date_range.start).getTime() / 1000),
      lte: Math.floor(new Date(date_range.end).getTime() / 1000)
    },
    limit: 100
  }, {
    stripeAccount: escrowAccount.stripe_account_id
  });

  const totalRevenue = charges.data
    .filter(c => c.status === 'succeeded')
    .reduce((sum, c) => sum + c.amount, 0) / 100;  // Convert cents to dollars

  // Store metric
  await db.query(`
    INSERT INTO verification_data (
      account_id, connection_id, source, metric_type, metric_name,
      metric_value, date_range_start, date_range_end,
      is_verified, verified_at, api_response_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), $9)
  `, [
    req.user.id,
    escrowAccount.id,
    'stripe',
    'revenue',
    'Total Revenue',
    totalRevenue,
    date_range.start,
    date_range.end,
    JSON.stringify({ total_transactions: charges.data.length })
  ]);

  return res.json({
    metric: 'Total Revenue',
    value: totalRevenue,
    currency: 'USD',
    transactions: charges.data.length,
    verified: true
  });
}
```

---

## Testing with Sandbox Accounts

### Google Analytics 4 Test Account

#### Create GA4 Demo Property:
```bash
1. Visit: https://analytics.google.com/analytics/web/
2. Click "Admin" → "Create Property"
3. Name: "BestAdsUp Test Property"
4. Add demo data:
   - Go to "Property Settings"
   - Enable "Google Analytics 4 Demo Account"
```

#### Test OAuth Flow:
```bash
# Use your personal Google account for testing
# No need for separate test account
```

---

### HubSpot Test Account

#### Create Free HubSpot Account:
```bash
1. Visit: https://app.hubspot.com/signup
2. Sign up for free account
3. Skip onboarding wizard
4. Go to Settings → Integrations → API key
```

#### Add Test Contacts:
```typescript
// Script to seed test data
const contacts = [
  { email: 'test1@example.com', firstname: 'Test', lastname: 'User 1' },
  { email: 'test2@example.com', firstname: 'Test', lastname: 'User 2' }
];

for (const contact of contacts) {
  await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties: contact })
  });
}
```

---

### Stripe Test Account

#### Use Stripe Test Mode:
```bash
# All Stripe accounts have test mode by default
# Toggle "View test data" in top-left of dashboard
```

#### Test Credit Cards:
```javascript
// Successful payment
const testCard = {
  number: '4242424242424242',
  exp_month: 12,
  exp_year: 2025,
  cvc: '123'
};

// Failed payment (card declined)
const declinedCard = {
  number: '4000000000000002',
  exp_month: 12,
  exp_year: 2025,
  cvc: '123'
};

// Requires authentication (3D Secure)
const authRequiredCard = {
  number: '4000002500003155',
  exp_month: 12,
  exp_year: 2025,
  cvc: '123'
};
```

---

## Error Handling

### Common Errors

#### OAuth Token Expired:
```typescript
try {
  const metrics = await fetchGA4Metrics(connection);
} catch (error) {
  if (error.code === 401 || error.message.includes('invalid_grant')) {
    // Refresh token
    const newToken = await refreshGA4Token(connection.id);

    // Retry request
    return await fetchGA4Metrics(connection);
  }

  throw error;
}
```

#### Connection Revoked:
```typescript
if (error.message.includes('revoked') || error.code === 403) {
  // Update database
  await db.query(`
    UPDATE verification_connections
    SET is_active = false,
        connection_status = 'revoked',
        error_message = $1
    WHERE id = $2
  `, [error.message, connection.id]);

  // Notify user
  await sendEmail(user.email, 'Connection Lost', 'Please reconnect your account');
}
```

#### Rate Limit Exceeded:
```typescript
if (error.code === 429 || error.message.includes('quota')) {
  // Log rate limit hit
  await db.query(`
    INSERT INTO verification_sync_log (
      connection_id, sync_status, rate_limit_hit, error_message
    ) VALUES ($1, 'failed', true, $2)
  `, [connection.id, 'Rate limit exceeded. Will retry in 1 hour.']);

  // Retry after delay
  setTimeout(() => fetchGA4Metrics(connection), 3600000);  // 1 hour
}
```

---

## Rate Limiting

### Google Analytics API
- **Quota:** 10,000 requests/day per project
- **Concurrent requests:** 10
- **Strategy:** Cache results for 24 hours

```typescript
// utils/cache.ts
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 86400 });  // 24 hours

export async function fetchWithCache(key, fetchFn) {
  const cached = cache.get(key);
  if (cached) return cached;

  const result = await fetchFn();
  cache.set(key, result);
  return result;
}

// Usage
const metrics = await fetchWithCache(
  `ga4_metrics_${user.id}_${property_id}`,
  () => fetchGA4Metrics(connection, property_id)
);
```

### HubSpot API
- **Quota:** 100 requests/10 seconds
- **Daily limit:** 250,000 requests
- **Strategy:** Queue requests

```typescript
// utils/queue.ts
import PQueue from 'p-queue';
const hubspotQueue = new PQueue({ concurrency: 10, interval: 10000, intervalCap: 100 });

export async function queuedHubSpotRequest(fn) {
  return hubspotQueue.add(fn);
}
```

### Stripe API
- **No hard rate limit** but best practice: < 100 req/s
- **Strategy:** Batch operations

---

## Related Documentation

- [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) - API endpoint specifications
- [DATABASE_SCHEMA.md](./database/DATABASE_SCHEMA.md) - Database tables
- [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) - Environment setup

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Maintained By:** Engineering Team
