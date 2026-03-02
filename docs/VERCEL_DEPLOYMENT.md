# Vercel Deployment Guide

Complete guide for deploying BestAdsUp to Vercel with production-ready configuration.

## ⚠️ CRITICAL: Two-Project Deployment Required

This is a **monorepo**. You **MUST** deploy as **two separate Vercel projects**:
1. **Backend API** - Deploy from `services/control-plane` root directory
2. **Frontend Dashboard** - Deploy from `packages/dashboard` root directory

**DO NOT** deploy from the repository root - Vercel will try to build it as a Next.js app and fail.

---

## Table of Contents

1. [Deployment Architecture](#deployment-architecture)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Environment Variables](#environment-variables)
5. [Deployment Steps](#deployment-steps)
6. [Database Setup](#database-setup)
7. [OAuth Configuration](#oauth-configuration)
8. [Custom Domains](#custom-domains)
9. [Troubleshooting](#troubleshooting)

---

## Deployment Architecture

BestAdsUp uses a **monorepo structure** deployed as two separate Vercel projects:

```
┌─────────────────────────────────────────────────────┐
│                    Vercel                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐      ┌──────────────────┐   │
│  │   Dashboard      │      │   API            │   │
│  │   (Frontend)     │◄────►│   (Backend)      │   │
│  │                  │      │                  │   │
│  │  React SPA       │      │  Express.js      │   │
│  │  Static Build    │      │  Serverless      │   │
│  └──────────────────┘      └──────────────────┘   │
│         │                          │               │
│         │                          │               │
│         └──────────┬───────────────┘               │
│                    │                                │
└────────────────────┼────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Neon/Vercel   │
            │  Postgres      │
            └────────────────┘
```

### Why Two Projects?

1. **Independent Scaling**: Frontend and backend scale separately
2. **Custom Domains**: Different domains for app and API
3. **Build Optimization**: Static frontend, serverless backend
4. **Environment Isolation**: Separate environment variables

---

## Prerequisites

- [ ] Vercel account (free or pro)
- [ ] GitHub repository with code
- [ ] PostgreSQL database (Neon recommended for Vercel)
- [ ] Stripe account (live mode for production)
- [ ] OAuth apps created (Google, HubSpot, Stripe Connect)
- [ ] Custom domains (optional but recommended)

---

## Project Setup

### Option 1: Deploy Both (Recommended)

Deploy frontend and backend as separate Vercel projects for best performance.

### Option 2: Monorepo Deploy

Deploy from root with routing configuration (simpler but less flexible).

---

## Step-by-Step Deployment

### 1. Deploy Backend (API)

#### A. Create New Vercel Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **⚠️ CRITICAL - Project Settings:**
   - **Framework Preset:** Other
   - **Root Directory:** `services/control-plane` ← **MUST SET THIS!**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

**Important:** The "Root Directory" setting tells Vercel to build ONLY the backend API from the `services/control-plane` subfolder. Without this, the build will fail.

#### B. Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": "dist"
}
```

#### C. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

**Database:**
```bash
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**JWT Authentication:**
```bash
JWT_SECRET=<generate-with-crypto>
JWT_REFRESH_SECRET=<generate-with-crypto>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

**Stripe:**
```bash
STRIPE_SECRET_KEY=sk_live_xxxxx...
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx...
PLATFORM_FEE_PERCENT=15
BUYER_FEE_PERCENT=10
CREATOR_FEE_PERCENT=5
```

**Google OAuth:**
```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx...
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/verification/oauth/callback/ga4
```

**HubSpot OAuth (Optional):**
```bash
HUBSPOT_CLIENT_ID=xxxxx-xxxxx-xxxxx-xxxxx
HUBSPOT_CLIENT_SECRET=xxxxx-xxxxx-xxxxx-xxxxx
HUBSPOT_REDIRECT_URI=https://api.yourdomain.com/verification/oauth/callback/hubspot
```

**Application URLs:**
```bash
NODE_ENV=production
FRONTEND_URL=https://app.yourdomain.com
API_BASE_URL=https://api.yourdomain.com/api/v1
CORS_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
```

**Security:**
```bash
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
FORCE_HTTPS=true
ENABLE_HELMET=true
TRUST_PROXY=true
BCRYPT_ROUNDS=12
```

#### D. Deploy

```bash
# From root directory
cd services/control-plane
vercel --prod
```

Or deploy via GitHub integration (automatic on push).

---

### 2. Deploy Frontend (Dashboard)

#### A. Create New Vercel Project

1. Go to https://vercel.com/new
2. **Import same GitHub repository** (yes, import the same repo again!)
3. **⚠️ CRITICAL - Project Settings:**
   - **Framework Preset:** Other (or React if detected)
   - **Root Directory:** `packages/dashboard` ← **DIFFERENT ROOT!**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

**Important:** You're creating a second Vercel project from the same GitHub repo, but with a different root directory. This deploys ONLY the frontend.

#### B. Environment Variables

Add these in Vercel Dashboard:

```bash
# API endpoint (points to your backend deployment)
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1

# Stripe publishable key (frontend needs this)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx...

# Optional: Analytics
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
REACT_APP_MIXPANEL_TOKEN=xxxxx...
```

#### C. Update Webpack Config

Ensure `packages/dashboard/webpack.config.js` uses environment variables:

```javascript
// Already configured, but verify:
const webpack = require('webpack');

plugins: [
  new webpack.DefinePlugin({
    'process.env.REACT_APP_API_BASE_URL': JSON.stringify(
      process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002/api/v1'
    ),
  }),
]
```

#### D. Deploy

```bash
# From root directory
cd packages/dashboard
vercel --prod
```

---

## Database Setup

### Using Neon (Recommended for Vercel)

Neon is a serverless Postgres designed for Vercel with auto-scaling.

#### 1. Create Neon Database

1. Go to https://console.neon.tech/
2. Create new project
3. Copy connection string

#### 2. Add to Vercel

In Vercel Dashboard → Storage → Connect:
- Select "Neon"
- Link your Neon project
- Vercel automatically adds `DATABASE_URL`

#### 3. Run Migrations

```bash
# Set DATABASE_URL locally for migration
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Run all migrations
node scripts/run-all-migrations.js

# Verify
node scripts/audit-verification-schema.js
```

### Alternative: Vercel Postgres

1. In Vercel Dashboard → Storage → Create
2. Select "Postgres"
3. Create database
4. Connection string automatically added to environment

---

## OAuth Configuration

Update OAuth redirect URIs in provider dashboards to use Vercel URLs:

### Google Cloud Console

**Authorized Redirect URIs:**
```
https://api.yourdomain.com/verification/oauth/callback/ga4
https://your-backend.vercel.app/verification/oauth/callback/ga4
```

### Stripe Dashboard

**Redirect URIs:**
```
https://api.yourdomain.com/verification/oauth/callback/stripe
https://your-backend.vercel.app/verification/oauth/callback/stripe
```

### HubSpot Developer Portal

**Redirect URLs:**
```
https://api.yourdomain.com/verification/oauth/callback/hubspot
https://your-backend.vercel.app/verification/oauth/callback/hubspot
```

### Stripe Webhooks

**Endpoint URL:**
```
https://api.yourdomain.com/api/v1/webhooks/stripe
```

**Events:**
- `payment_intent.succeeded`
- `charge.refunded`
- `transfer.paid`
- `payout.paid`

Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

---

## Custom Domains

### Backend API Domain

1. Vercel Dashboard → Your API Project → Settings → Domains
2. Add domain: `api.yourdomain.com`
3. Update DNS:
   ```
   Type: CNAME
   Name: api
   Value: cname.vercel-dns.com
   ```

### Frontend Domain

1. Vercel Dashboard → Your Dashboard Project → Settings → Domains
2. Add domain: `app.yourdomain.com` (or `www.yourdomain.com`)
3. Update DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

### Update Environment Variables

After domains are configured, update:

**Backend:**
```bash
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
```

**Frontend:**
```bash
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1
```

**OAuth Providers:**
- Update redirect URIs to use `api.yourdomain.com`

---

## Vercel-Specific Optimizations

### 1. Enable Edge Functions (Optional)

For ultra-low latency, convert serverless functions to edge:

```typescript
// services/control-plane/src/index.ts
export const config = {
  runtime: 'edge', // or 'nodejs18.x' for full Node.js
};
```

### 2. Configure Regions

In `vercel.json`:
```json
{
  "regions": ["iad1", "sfo1", "fra1"]
}
```

### 3. Optimize Build

Add to `package.json`:
```json
{
  "vercel": {
    "cleanUrls": true,
    "trailingSlash": false,
    "redirects": [
      {
        "source": "/",
        "destination": "/dashboard"
      }
    ]
  }
}
```

---

## Deployment Checklist

### Before First Deploy

- [ ] Database migrated and verified
- [ ] All environment variables configured in Vercel
- [ ] OAuth apps updated with Vercel URLs
- [ ] Stripe webhook endpoint created
- [ ] Custom domains configured (optional)

### After Deploy

- [ ] Test API health endpoint: `https://api.yourdomain.com/health`
- [ ] Test frontend loads: `https://app.yourdomain.com`
- [ ] Test authentication (signup/login)
- [ ] Test OAuth flow (verification page)
- [ ] Test Stripe payment flow
- [ ] Verify webhook deliveries in Stripe Dashboard
- [ ] Check Vercel function logs for errors
- [ ] Run production setup validation:
  ```bash
  node scripts/setup-production.js
  ```

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Production:** Push to `main` branch
- **Preview:** Push to any other branch or open PR

### Manual Deployments

```bash
# Deploy production
vercel --prod

# Deploy preview
vercel
```

### Deployment Protection

Enable in Vercel Dashboard → Settings → Deployment Protection:
- Require approval for production deploys
- Enable Vercel Authentication for preview deployments

---

## Monitoring & Logs

### View Logs

**Vercel Dashboard:**
1. Select project
2. Go to "Logs" tab
3. Filter by deployment or function

**CLI:**
```bash
vercel logs <deployment-url>
```

### Add Custom Logging

```typescript
// services/control-plane/src/index.ts
console.log('[Vercel]', 'Server started');
console.error('[Vercel]', 'Error:', error);
```

Logs appear in Vercel Dashboard and can be streamed to:
- Datadog
- LogDNA
- Logtail
- Axiom

---

## Troubleshooting

### Issue: "Module not found"

**Cause:** Vercel build can't find dependencies

**Fix:**
1. Ensure `package.json` is in root directory being built
2. Check `installCommand` in vercel.json
3. Verify `node_modules` not in `.vercelignore`

### Issue: "Database connection failed"

**Cause:** DATABASE_URL not set or incorrect

**Fix:**
1. Verify DATABASE_URL in Vercel environment variables
2. Ensure database allows connections from Vercel IPs (0.0.0.0/0 for Neon)
3. Check `sslmode=require` in connection string

### Issue: "CORS errors"

**Cause:** Frontend domain not in CORS_ORIGINS

**Fix:**
```bash
# In backend environment variables
CORS_ORIGINS=https://app.yourdomain.com,https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://app.yourdomain.com,https://your-frontend.vercel.app
```

### Issue: "OAuth redirect fails"

**Cause:** Redirect URI mismatch

**Fix:**
1. Verify redirect URIs in provider dashboards match Vercel URLs exactly
2. Check environment variables:
   ```bash
   GOOGLE_REDIRECT_URI=https://api.yourdomain.com/verification/oauth/callback/ga4
   ```

### Issue: "Function timeout"

**Cause:** Serverless function exceeds 10s timeout (hobby) or 60s (pro)

**Fix:**
1. Optimize database queries
2. Use indexes
3. Upgrade to Vercel Pro for 60s timeout
4. Move long operations to background jobs

### Issue: "Environment variables not updating"

**Cause:** Vercel caches deployments

**Fix:**
1. Redeploy after changing environment variables
2. Or use Vercel CLI:
   ```bash
   vercel env pull
   vercel --prod
   ```

---

## Performance Optimization

### 1. Enable Caching

```typescript
// Add cache headers
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  // ...
}
```

### 2. Use ISR (Incremental Static Regeneration)

For semi-static content:
```typescript
export const config = {
  revalidate: 60, // Revalidate every 60 seconds
};
```

### 3. Optimize Images

Use Vercel Image Optimization:
```jsx
import Image from 'next/image'; // If using Next.js
// Or configure in vercel.json for static builds
```

---

## Cost Estimation

### Vercel Hobby (Free)

- ✅ Perfect for development/testing
- ✅ Unlimited deployments
- ❌ 10s function timeout
- ❌ 100GB bandwidth/month

### Vercel Pro ($20/month per member)

- ✅ 60s function timeout
- ✅ 1TB bandwidth/month
- ✅ Priority support
- ✅ Deployment protection
- ✅ Custom domains

### Neon Free Tier

- ✅ 3GB storage
- ✅ 100 hours compute/month
- ✅ Auto-scaling

---

## Security Best Practices

1. **Never commit `.env`** - Use Vercel environment variables
2. **Use environment-specific secrets** - Different keys for production/preview
3. **Enable Vercel Authentication** - Protect preview deployments
4. **Configure CORS properly** - Only allow trusted origins
5. **Use HTTPS** - Automatically enabled on Vercel
6. **Rotate secrets regularly** - Every 90 days
7. **Monitor logs** - Check for suspicious activity

---

## Migration from Other Hosts

### From Heroku

1. Export Heroku config vars
2. Import to Vercel environment variables
3. Update buildpacks → Vercel build configuration
4. Change URLs in OAuth providers

### From AWS/DigitalOcean

1. Database: Migrate to Neon or keep existing (ensure public access)
2. Environment: Copy from server to Vercel
3. Code: Already in GitHub
4. DNS: Update to point to Vercel

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Neon Docs:** https://neon.tech/docs
- **BestAdsUp Setup:** `docs/PRODUCTION_SETUP.md`
- **Validation:** `node scripts/setup-production.js`

---

**Last Updated:** March 2026
**Verified With:** Vercel v31+, Node.js v20.x
