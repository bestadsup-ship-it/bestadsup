# Verification System - OAuth Setup Guide

The verification system supports real OAuth integration with Google Analytics, HubSpot, and Stripe. Currently running in **demo mode** - this guide explains how to enable real OAuth.

## Current Status: Demo Mode

Without OAuth credentials configured, the system creates placeholder connections for demonstration purposes. To enable real OAuth authentication, follow the steps below.

---

## 🔐 Enabling Real OAuth

### Prerequisites
- Access to Google Cloud Console, HubSpot Developer Portal, and/or Stripe Dashboard
- Backend running at a publicly accessible URL (for OAuth callbacks)

---

## 1. Google Analytics 4 Setup

### Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Analytics API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:3002/verification/oauth/callback/ga4`
   - Production: `https://yourdomain.com/api/verification/oauth/callback/ga4`
7. Copy **Client ID** and **Client Secret**

### Add to Environment Variables

```bash
# .env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/ga4
```

### Required Scopes
- `https://www.googleapis.com/auth/analytics.readonly` - Read-only access to Analytics data

---

## 2. HubSpot Setup

### Create HubSpot App

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app
3. Go to **Auth** tab
4. Add redirect URL:
   - Development: `http://localhost:3002/verification/oauth/callback/hubspot`
   - Production: `https://yourdomain.com/api/verification/oauth/callback/hubspot`
5. Add required scopes (see below)
6. Copy **Client ID** and **Client Secret**

### Add to Environment Variables

```bash
# .env
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
HUBSPOT_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/hubspot
```

### Required Scopes
- `analytics.read` - Read analytics data
- `crm.objects.contacts.read` - Read contact data for lead metrics

---

## 3. Stripe Setup

### Create Stripe Connect Application

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Settings** → **Connect** → **Integration**
3. Add redirect URI:
   - Development: `http://localhost:3002/verification/oauth/callback/stripe`
   - Production: `https://yourdomain.com/api/verification/oauth/callback/stripe`
4. Copy **Client ID**
5. Get **Secret Key** from API keys section

### Add to Environment Variables

```bash
# .env
STRIPE_CONNECT_CLIENT_ID=ca_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # or sk_live_ for production
STRIPE_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/stripe
```

### Required Scopes
- `read_only` - Read-only access to account data

---

## 🚀 Testing OAuth Flow

Once credentials are configured:

1. Restart the backend server
2. Go to `/verification` page
3. Click "Connect" on any service
4. You should be redirected to the provider's OAuth consent page
5. After authorizing, you'll be redirected back with a real connection

The demo mode warnings will automatically disappear when OAuth credentials are detected.

---

## 🔄 OAuth Flow Architecture

### 1. Initiation (`POST /verification/oauth/initiate`)
- Backend checks if OAuth credentials are configured
- If yes: Generates state token, stores in DB, returns authorization URL
- If no: Creates demo connection (current behavior)

### 2. Authorization
- User is redirected to provider's OAuth page
- User grants permissions
- Provider redirects to callback URL with authorization code

### 3. Callback (`GET /verification/oauth/callback/:serviceName`)
- Backend receives authorization code
- Validates state token (CSRF protection)
- Exchanges code for access/refresh tokens
- Stores encrypted tokens in `verification_connections` table
- Redirects user back to dashboard

### 4. Token Management
- Access tokens stored encrypted in database
- Refresh tokens used to get new access tokens when expired
- Automatic token refresh before API calls

---

## 📊 Data Syncing (TODO)

After OAuth is connected, the system should:

1. Pull initial metrics from the provider's API
2. Store verified data in `verification_data` table
3. Schedule periodic syncs (daily/weekly)
4. Update verification badges based on metrics

### API Endpoints Needed
- Google Analytics: `https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`
- HubSpot: `https://api.hubapi.com/analytics/v2/reports`
- Stripe: `https://api.stripe.com/v1/balance_transactions`

---

## 🔒 Security Considerations

1. **Token Encryption**: Access/refresh tokens should be encrypted before storing
2. **State Validation**: Always verify state parameter to prevent CSRF
3. **Token Expiry**: Implement automatic token refresh logic
4. **Scope Limitation**: Only request read-only scopes
5. **Error Handling**: Handle revoked tokens gracefully

---

## 📝 Environment Variables Summary

```bash
# Google Analytics
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/ga4

# HubSpot
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/hubspot

# Stripe
STRIPE_CONNECT_CLIENT_ID=
STRIPE_SECRET_KEY=
STRIPE_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/stripe

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:3005
```

---

## ✅ Verification Checklist

- [ ] Created OAuth apps in all three provider consoles
- [ ] Added redirect URIs to each provider
- [ ] Copied credentials to `.env` file
- [ ] Restarted backend server
- [ ] Tested OAuth flow for each service
- [ ] Implemented token encryption
- [ ] Implemented token refresh logic
- [ ] Implemented data syncing from APIs
- [ ] Set up periodic sync jobs

---

## 🐛 Troubleshooting

### "Demo Mode" still showing
- Verify environment variables are set correctly
- Restart backend server to load new env vars
- Check backend logs for OAuth configuration status

### OAuth redirect fails
- Ensure redirect URI in code matches provider settings exactly
- Check that backend URL is publicly accessible (use ngrok for local dev)
- Verify provider app is in development mode if testing

### Tokens not refreshing
- Check token expiry logic in code
- Ensure refresh tokens are being stored
- Verify refresh token API endpoint is correct

---

For questions or issues, see the main verification system documentation.
