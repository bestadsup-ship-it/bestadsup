# Vercel Quick Start Guide

Fast-track guide to deploy BestAdsUp to Vercel in under 30 minutes.

## ⚠️ CRITICAL: Deploy as TWO Separate Projects

This is a **monorepo**. You MUST create **two separate Vercel projects**:
1. Backend API (from `services/control-plane`)
2. Frontend Dashboard (from `packages/dashboard`)

**DO NOT** deploy from the repository root - it will fail.

---

## 🚀 Quick Deploy

## Prerequisites Checklist

- [ ] Vercel account ([Sign up free](https://vercel.com/signup))
- [ ] GitHub repository connected
- [ ] Neon database ([Create free](https://console.neon.tech/signup))
- [ ] Stripe account ([Sign up](https://dashboard.stripe.com/register))

---

## Step 1: Deploy Backend API (5 mins)

### A. Create Vercel Project

1. Go to https://vercel.com/new
2. **Import repository:** Select your GitHub repository
3. **⚠️ CRITICAL - Configure Root Directory:**
   ```
   Project Name: bestadsup-api
   Framework Preset: Other
   Root Directory: services/control-plane    ← MUST SET THIS!
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

**Important:** If you don't set "Root Directory" to `services/control-plane`, the build will fail.

### B. Add Environment Variables

Click "Environment Variables" and add:

```bash
# Database (from Neon dashboard)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# JWT Secrets (generate below)
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Stripe (from dashboard)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# URLs (update after deploy)
FRONTEND_URL=https://app.yourdomain.com
API_BASE_URL=https://api.yourdomain.com/api/v1
CORS_ORIGINS=https://app.yourdomain.com

# Security
NODE_ENV=production
COOKIE_SECURE=true
FORCE_HTTPS=true
```

### C. Deploy

Click **"Deploy"** and wait ~2 minutes.

---

## Step 2: Deploy Frontend (3 mins)

### A. Create Second Vercel Project

1. Go to https://vercel.com/new
2. **Import same repository** (yes, import again!)
3. **⚠️ CRITICAL - Configure Root Directory:**
   ```
   Project Name: bestadsup-dashboard
   Framework Preset: Other
   Root Directory: packages/dashboard    ← DIFFERENT ROOT!
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

**Important:** You're importing the same GitHub repo twice, but with different root directories.

### B. Add Environment Variables

```bash
# API endpoint (your backend URL from Step 1)
REACT_APP_API_BASE_URL=https://bestadsup-api.vercel.app/api/v1

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### C. Deploy

Click **"Deploy"** and wait ~2 minutes.

---

## Step 3: Setup Database (5 mins)

### Create Neon Database

1. Go to https://console.neon.tech/
2. Create new project: "bestadsup"
3. Copy connection string
4. Add to backend Vercel environment variables

### Run Migrations

```bash
# Clone repo locally if not already
git clone https://github.com/bestadsup-ship-it/bestadsup.git
cd bestadsup

# Install dependencies
npm install

# Set database URL
export DATABASE_URL="<your-neon-connection-string>"

# Run migrations
node scripts/run-all-migrations.js

# Verify
node scripts/audit-verification-schema.js
```

**Output should show:**
```
✓ All migrations completed successfully
✓ verification_data columns: metric_unit, time_period
✓ verification_badges columns: badge_level
✓ verification_requests columns: request_data, reviewer_notes
```

---

## Step 4: Configure OAuth (10 mins)

### Google Analytics OAuth

1. **Google Cloud Console:** https://console.cloud.google.com/
2. Create OAuth Client ID
3. Add redirect URI:
   ```
   https://bestadsup-api.vercel.app/verification/oauth/callback/ga4
   ```
4. Copy credentials to Vercel:
   ```bash
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   GOOGLE_REDIRECT_URI=https://bestadsup-api.vercel.app/verification/oauth/callback/ga4
   ```

### Stripe Connect OAuth

1. **Stripe Dashboard:** https://dashboard.stripe.com/settings/connect
2. Add redirect URI:
   ```
   https://bestadsup-api.vercel.app/verification/oauth/callback/stripe
   ```
3. Copy credentials to Vercel:
   ```bash
   STRIPE_CONNECT_CLIENT_ID=ca_xxx
   ```

### Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint:
   ```
   URL: https://bestadsup-api.vercel.app/api/v1/webhooks/stripe
   Events: payment_intent.succeeded, charge.refunded
   ```
3. Copy signing secret:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

---

## Step 5: Add Custom Domains (Optional, 5 mins)

### Backend Domain

1. Vercel → bestadsup-api → Settings → Domains
2. Add: `api.yourdomain.com`
3. Update DNS (at your domain registrar):
   ```
   Type: CNAME
   Name: api
   Value: cname.vercel-dns.com
   ```
4. Update environment variables:
   ```bash
   API_BASE_URL=https://api.yourdomain.com/api/v1
   GOOGLE_REDIRECT_URI=https://api.yourdomain.com/verification/oauth/callback/ga4
   ```

### Frontend Domain

1. Vercel → bestadsup-dashboard → Settings → Domains
2. Add: `app.yourdomain.com`
3. Update DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
4. Update environment variables:
   ```bash
   FRONTEND_URL=https://app.yourdomain.com
   CORS_ORIGINS=https://app.yourdomain.com
   REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```

### Update OAuth Providers

Update redirect URIs in:
- Google Cloud Console → Your OAuth App
- Stripe Dashboard → Connect Settings

Change from `.vercel.app` to your custom domains.

---

## ✅ Verification Checklist

Test your deployment:

- [ ] Backend health check: `https://your-backend.vercel.app/health`
- [ ] Frontend loads: `https://your-frontend.vercel.app`
- [ ] Signup/Login works
- [ ] OAuth connections work (no "Demo Mode" message)
- [ ] Create a test service
- [ ] Make a test payment (use Stripe test mode first)
- [ ] Check Vercel function logs for errors

### Run Production Validation

```bash
node scripts/setup-production.js
```

**Expected output:**
```
✅ Configured: 12
⚠️  Warnings: 0
❌ Issues: 0

🎯 Production Readiness:
   ✅ Ready for production deployment
   ✅ OAuth configured - Demo mode will be disabled
```

---

## 🎯 Post-Deployment

### 1. Test OAuth Flow

1. Visit: `https://your-frontend.vercel.app/verification`
2. Click "Connect" on Google Analytics
3. **Should redirect to Google OAuth** (not show demo mode message)
4. After authorizing, should redirect back with connection

### 2. Test Payments

1. Create a service
2. Add to cart
3. Checkout with Stripe test card: `4242 4242 4242 4242`
4. Verify payment appears in Stripe Dashboard

### 3. Monitor Logs

**Vercel Dashboard:**
- Backend project → Logs
- Frontend project → Logs

**Look for:**
- ❌ Errors or warnings
- ✅ Successful API calls
- ✅ Database connections

---

## 🆘 Common Issues

### "Module not found" error

**Fix:** Ensure `package.json` is in the root directory being built

```bash
# Check your root directory setting in Vercel
Root Directory: services/control-plane  # ✅
Root Directory: /services/control-plane # ❌
```

### "Database connection failed"

**Fix:** Check DATABASE_URL format

```bash
# Correct (with sslmode=require)
postgresql://user:pass@host/db?sslmode=require

# Wrong
postgresql://user:pass@host/db
```

### "CORS errors" in browser console

**Fix:** Update CORS_ORIGINS to include frontend URL

```bash
# In backend environment variables
CORS_ORIGINS=https://your-frontend.vercel.app,https://app.yourdomain.com
```

### OAuth still shows "Demo Mode"

**Fix:**
1. Verify OAuth credentials are set in Vercel
2. Redeploy backend to load new environment variables
3. Clear browser cache

---

## 📚 Full Documentation

- **Complete Guide:** [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)
- **Production Setup:** [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md)
- **OAuth Setup:** [docs/VERIFICATION_OAUTH_SETUP.md](docs/VERIFICATION_OAUTH_SETUP.md)

---

## 🎉 You're Live!

Your backend: `https://your-backend.vercel.app`
Your frontend: `https://your-frontend.vercel.app`

**Automatic Deployments:**
- Push to `main` → Production deploy
- Open PR → Preview deploy

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Run: `node scripts/setup-production.js` for validation
