# Production Setup Guide

This guide walks you through configuring BestAdsUp for production deployment, including removing demo mode and setting up real OAuth integrations.

## Table of Contents

1. [Pre-Production Checklist](#pre-production-checklist)
2. [Environment Variables](#environment-variables)
3. [OAuth Setup](#oauth-setup)
4. [Database Migration](#database-migration)
5. [Security Configuration](#security-configuration)
6. [Deployment](#deployment)

---

## Pre-Production Checklist

Before deploying to production, ensure you have:

- [ ] Production database provisioned (PostgreSQL)
- [ ] Domain name configured with SSL/TLS
- [ ] Stripe account (live mode)
- [ ] Google Cloud Platform account
- [ ] Email service configured (SendGrid)
- [ ] Production server/hosting setup
- [ ] Backup strategy in place

---

## Environment Variables

### Step 1: Update `.env` for Production

Copy your `.env.example` to `.env` and configure the following critical variables:

```bash
# 1. Set environment to production
NODE_ENV=production

# 2. Generate secure JWT secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 3. Configure production database
DATABASE_URL=postgresql://prod_user:secure_password@your-db-host:5432/bestadsup_prod

# 4. Set production URLs
FRONTEND_URL=https://app.bestadsup.com
API_BASE_URL=https://api.bestadsup.com/api/v1

# 5. Configure CORS for production
CORS_ORIGINS=https://app.bestadsup.com,https://www.bestadsup.com
ALLOWED_ORIGINS=https://app.bestadsup.com,https://www.bestadsup.com

# 6. Enable production security
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
FORCE_HTTPS=true
ENABLE_HELMET=true
TRUST_PROXY=true

# 7. Disable demo/test modes
MOCK_STRIPE_API=false
MOCK_GOOGLE_API=false
MOCK_HUBSPOT_API=false
TEST_MODE=false
SEED_TEST_DATA=false
```

---

## OAuth Setup

### Removing Demo Mode

The verification system runs in **demo mode** by default when OAuth credentials are not configured. To enable real OAuth:

1. Configure OAuth credentials in `.env`
2. Restart the backend server
3. Demo mode will automatically disable

### 1. Google Analytics 4 OAuth

**Purpose:** Verify traffic, conversion rates, and user engagement metrics

#### Setup Steps:

1. **Go to Google Cloud Console**
   - Navigate to https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google Analytics API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Analytics API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `BestAdsUp Production`

4. **Configure Redirect URIs**
   Add these authorized redirect URIs:
   ```
   https://api.bestadsup.com/verification/oauth/callback/ga4
   ```

5. **Copy Credentials to `.env`**
   ```bash
   GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxx
   GOOGLE_REDIRECT_URI=https://api.bestadsup.com/verification/oauth/callback/ga4
   ```

6. **Required Scopes** (automatically configured):
   - `https://www.googleapis.com/auth/analytics.readonly` - Read-only access to Analytics data

#### Testing:
```bash
# Restart backend
cd services/control-plane
npm run dev  # or your production start command

# Test OAuth flow
# Visit: https://app.bestadsup.com/verification
# Click "Connect" on Google Analytics
# Should redirect to Google OAuth consent page (not demo mode)
```

---

### 2. HubSpot OAuth (Optional - Phase 2)

**Purpose:** Verify lead generation and CRM metrics

#### Setup Steps:

1. **Go to HubSpot Developer Portal**
   - Navigate to https://developers.hubspot.com/
   - Create a new app

2. **Configure OAuth Settings**
   - Go to "Auth" tab
   - Add redirect URL:
     ```
     https://api.bestadsup.com/verification/oauth/callback/hubspot
     ```

3. **Add Required Scopes**
   - `analytics.read` - Read analytics data
   - `crm.objects.contacts.read` - Read contact data for lead metrics

4. **Copy Credentials to `.env`**
   ```bash
   HUBSPOT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   HUBSPOT_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   HUBSPOT_REDIRECT_URI=https://api.bestadsup.com/verification/oauth/callback/hubspot
   ```

---

### 3. Stripe Connect OAuth

**Purpose:** Verify revenue and payment metrics

#### Setup Steps:

1. **Go to Stripe Dashboard**
   - Navigate to https://dashboard.stripe.com/
   - Switch to **Live mode** (top right)

2. **Configure Stripe Connect**
   - Go to "Settings" → "Connect" → "Integration"
   - Add redirect URI:
     ```
     https://api.bestadsup.com/verification/oauth/callback/stripe
     ```

3. **Get Credentials**
   - Client ID: Found in Connect settings
   - Secret Key: "Developers" → "API keys" → "Secret key"

4. **Add to `.env`**
   ```bash
   STRIPE_CONNECT_CLIENT_ID=ca_xxxxx...
   STRIPE_SECRET_KEY=sk_live_xxxxx...  # Use your actual live key
   STRIPE_REDIRECT_URI=https://api.bestadsup.com/verification/oauth/callback/stripe

   # Also add publishable key for frontend
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx...  # Use your actual live key
   ```

5. **Configure Webhook Endpoint**
   - Go to "Developers" → "Webhooks" → "Add endpoint"
   - Endpoint URL: `https://api.bestadsup.com/api/v1/webhooks/stripe`
   - Events to send:
     - `payment_intent.succeeded`
     - `charge.refunded`
     - `transfer.paid`
     - `payout.paid`
   - Copy webhook signing secret:
     ```bash
     STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
     ```

---

## Database Migration

### Run All Migrations

```bash
# Navigate to project root
cd /path/to/B2BAdSite

# Run all database migrations
node scripts/run-all-migrations.js
```

This will execute migrations in the correct order:
1. Core schema (accounts, products, orders)
2. Verification system (badges, metrics, connections)
3. Profile enhancements (B2B features)

### Verify Schema

```bash
# Audit verification system schema
node scripts/audit-verification-schema.js

# Should show all required columns:
# - verification_data: metric_unit, time_period
# - verification_badges: badge_level
# - verification_requests: request_data, reviewer_notes
```

---

## Security Configuration

### 1. SSL/TLS Certificates

Ensure your server has valid SSL certificates:

```bash
# Let's Encrypt (recommended for free SSL)
sudo certbot --nginx -d api.bestadsup.com
sudo certbot --nginx -d app.bestadsup.com
```

Update `.env`:
```bash
FORCE_HTTPS=true
SSL_CERT_PATH=/etc/letsencrypt/live/api.bestadsup.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/api.bestadsup.com/privkey.pem
```

### 2. Database SSL

For production databases (RDS, Heroku Postgres, etc.):

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

### 3. Security Headers

Automatically enabled with Helmet:

```bash
ENABLE_HELMET=true
```

### 4. Rate Limiting

Configure rate limits to prevent abuse:

```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per 15 min
```

---

## Verification of Production Setup

### 1. Check OAuth Configuration

```bash
# Backend should log OAuth status on startup
# Look for:
# ✓ Google OAuth configured
# ✓ HubSpot OAuth configured
# ✓ Stripe OAuth configured
```

### 2. Test OAuth Flow

1. Visit https://app.bestadsup.com/verification
2. Click "Connect" on Google Analytics
3. **Should see:** Google OAuth consent page (NOT demo mode message)
4. After authorizing, should redirect back with connection established

### 3. Verify No Demo Mode

Demo mode indicators to check:
- ❌ No "Demo Mode" badges on verification page
- ❌ No console warnings about missing OAuth credentials
- ✓ Real OAuth redirect URLs in network tab
- ✓ OAuth state tokens being generated

---

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:3005
API_BASE_URL=http://localhost:3002/api/v1
GOOGLE_REDIRECT_URI=http://localhost:3002/verification/oauth/callback/ga4
```

### Staging
```bash
NODE_ENV=staging
FRONTEND_URL=https://staging.bestadsup.com
API_BASE_URL=https://staging-api.bestadsup.com/api/v1
GOOGLE_REDIRECT_URI=https://staging-api.bestadsup.com/verification/oauth/callback/ga4
```

### Production
```bash
NODE_ENV=production
FRONTEND_URL=https://app.bestadsup.com
API_BASE_URL=https://api.bestadsup.com/api/v1
GOOGLE_REDIRECT_URI=https://api.bestadsup.com/verification/oauth/callback/ga4
```

---

## Deployment Checklist

- [ ] All OAuth credentials configured in `.env`
- [ ] Production database migrated
- [ ] SSL certificates installed
- [ ] Webhook endpoints configured (Stripe)
- [ ] Environment variables set on hosting platform
- [ ] Secrets stored in secure vault (not in code)
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Monitoring/error tracking enabled (Sentry)
- [ ] Demo mode disabled (verify in UI)
- [ ] Test complete OAuth flow for each service
- [ ] DNS records configured
- [ ] Firewall rules configured

---

## Troubleshooting

### "Demo Mode still showing"

**Cause:** OAuth credentials not detected

**Fix:**
1. Verify environment variables are set:
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```
2. Restart backend server to load new env vars
3. Check backend logs for OAuth configuration status

### "OAuth redirect fails"

**Cause:** Redirect URI mismatch

**Fix:**
1. Ensure redirect URI in code matches provider settings **exactly**
2. Backend URL must be publicly accessible (use ngrok for local testing)
3. Verify provider app is not in sandbox/development mode

### "Tokens not refreshing"

**Cause:** Missing refresh token logic

**Fix:**
1. Check token expiry handling in `oauth.ts`
2. Ensure refresh tokens are being stored
3. Verify refresh token API endpoint is correct

---

## Support

For issues with production setup:
- Review logs: `services/control-plane/logs/`
- Check documentation: `docs/VERIFICATION_OAUTH_SETUP.md`
- Verify schema: `node scripts/audit-verification-schema.js`

---

## Security Best Practices

1. **Never commit `.env` to version control**
2. Use strong, randomly generated secrets for production
3. Rotate secrets regularly (every 90 days recommended)
4. Use different credentials for dev/staging/prod
5. Store production secrets in secure vault (AWS Secrets Manager, etc.)
6. Enable database SSL in production
7. Use HTTPS everywhere
8. Configure proper CORS origins
9. Enable rate limiting
10. Monitor for security issues with Sentry/logging

---

**Last Updated:** March 2026
**Verified With:** Node.js v20.x, PostgreSQL 14+
