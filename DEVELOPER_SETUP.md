# Developer Setup Guide
## BestAdsUp - Verified Performance Marketing Marketplace

**Last Updated:** February 28, 2026
**Prerequisites Checklist:** PostgreSQL 15+, Node.js 20+, Stripe Account, Google Cloud Project

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js 20+** and **npm 10+**
  ```bash
  node --version  # Should be v20.x.x or higher
  npm --version   # Should be 10.x.x or higher
  ```
  Download: https://nodejs.org/

- **PostgreSQL 15+**
  ```bash
  psql --version  # Should be 15.x or higher
  ```
  Download: https://www.postgresql.org/download/

- **Git**
  ```bash
  git --version
  ```

### Required Accounts

1. **Stripe Account** (for escrow payments)
   - Sign up at https://stripe.com
   - Get test API keys from Dashboard → Developers → API keys
   - Enable Connect for escrow: Dashboard → Settings → Connect

2. **Google Cloud Project** (for Google Analytics 4 OAuth)
   - Create project at https://console.cloud.google.com
   - Enable Google Analytics API
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `http://localhost:3005/verification/callback`

3. **HubSpot Developer Account** (Phase 2 - optional for MVP)
   - Sign up at https://developers.hubspot.com
   - Create app and get OAuth credentials

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/B2BAdSite.git
cd B2BAdSite
```

### 2. Install Dependencies

```bash
# Install all dependencies (backend + frontend)
npm install

# Or install separately
cd services/control-plane && npm install
cd ../../packages/dashboard && npm install
```

### 3. Verify Installation

```bash
npm run verify  # Checks Node, PostgreSQL, dependencies
```

---

## Database Setup

### 1. Create Database

```bash
# Using createdb command
createdb bestadsup

# OR using psql
psql postgres
CREATE DATABASE bestadsup;
\q
```

### 2. Run Migrations (In Order)

**IMPORTANT:** Migrations must be run in this exact order to avoid foreign key errors.

```bash
# 1. Core schema (accounts, products, posts)
psql bestadsup < database/schema.sql

# 2. Authentication & security
psql bestadsup < database/auth-security-migration.sql

# 3. Verification system (OAuth, badges)
psql bestadsup < database/verification-system-migration.sql

# 4. Escrow payments (Stripe Connect)
psql bestadsup < database/escrow-payments-migration.sql

# 5. Project management (milestones, deliverables)
psql bestadsup < database/project-management-migration.sql

# 6. Shop/marketplace features
psql bestadsup < database/shop.sql
```

**Alternative: Run all migrations with script**

```bash
# If script exists
npm run migrate

# Or use the provided script
psql bestadsup < scripts/run-all-migrations.js
```

### 3. Verify Database Tables

```bash
psql bestadsup

# List all tables
\dt

# Should see:
# - accounts
# - verification_connections
# - verification_data
# - verification_badges
# - escrow_accounts
# - escrow_transactions
# - payment_methods
# - projects
# - project_milestones
# - project_deliverables
# - products (services)
# - ... and more

\q
```

### 4. Seed Test Data (Optional)

```bash
# Create test accounts and sample projects
psql bestadsup < database/seed-test-data.sql
```

---

## Environment Variables

### 1. Copy Example File

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit `.env` and fill in these **REQUIRED** values:

```env
# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL=postgresql://localhost:5432/bestadsup
# For production: postgresql://user:password@host:5432/bestadsup

# ============================================================================
# JWT AUTHENTICATION
# ============================================================================
JWT_SECRET=your-256-bit-secret-here-change-this-in-production
# Generate a secure secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_REFRESH_SECRET=your-refresh-token-secret-here
# Generate another different secret

# ============================================================================
# STRIPE (Get from https://dashboard.stripe.com/test/apikeys)
# ============================================================================
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
# Get webhook secret after creating webhook endpoint

# ============================================================================
# GOOGLE OAUTH (For GA4 Verification)
# ============================================================================
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3005/verification/callback
# For production: https://app.bestadsup.com/verification/callback

# ============================================================================
# APPLICATION
# ============================================================================
NODE_ENV=development
PORT=3002
FRONTEND_URL=http://localhost:3005
API_BASE_URL=http://localhost:3002/api/v1

# ============================================================================
# EMAIL (SendGrid)
# ============================================================================
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@bestadsup.com
SENDGRID_FROM_NAME=BestAdsUp

# ============================================================================
# OPTIONAL (Phase 2+)
# ============================================================================
# HubSpot (for lead verification)
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=

# Sentry (error tracking)
SENTRY_DSN=

# Mixpanel (product analytics)
MIXPANEL_TOKEN=

# Redis (caching - optional for dev)
REDIS_URL=redis://localhost:6379
```

### 3. Get API Keys

#### Stripe Test Keys:
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (sk_test_...)
3. Copy **Publishable key** (pk_test_...)
4. For webhook secret:
   - Go to Developers → Webhooks
   - Add endpoint: `http://localhost:3002/api/v1/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `charge.refunded`, `transfer.paid`
   - Copy webhook signing secret (whsec_...)

#### Google OAuth Credentials:
1. Go to https://console.cloud.google.com
2. Select your project
3. APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:3005/verification/callback`
7. Copy Client ID and Client Secret

#### SendGrid API Key:
1. Sign up at https://sendgrid.com
2. Settings → API Keys
3. Create API Key with "Full Access"
4. Copy API key (starts with `SG.`)

---

## Running the Application

### Development Mode (Recommended)

```bash
# Run both backend and frontend concurrently
npm run dev
```

This starts:
- **Backend API**: http://localhost:3002
- **Frontend**: http://localhost:3005

### Run Separately

```bash
# Terminal 1 - Backend
cd services/control-plane
npm run dev

# Terminal 2 - Frontend
cd packages/dashboard
npm run dev
```

### Production Build

```bash
# Build both backend and frontend
npm run build

# Start production server
npm start
```

### Verify Application is Running

1. Open browser: http://localhost:3005
2. You should see the signup page
3. API health check: http://localhost:3002/health
   - Should return: `{"status": "ok", "database": "connected"}`

---

## Troubleshooting

### Issue: Database Connection Fails

**Error:** `ECONNREFUSED` or `database "bestadsup" does not exist`

**Solution:**
```bash
# Check PostgreSQL is running
psql --version

# On Windows (if using PostgreSQL service)
# Services → PostgreSQL → Start

# On Mac/Linux
brew services start postgresql  # Mac
sudo systemctl start postgresql  # Linux

# Verify database exists
psql -l | grep bestadsup

# If not, create it
createdb bestadsup
```

### Issue: Port 3002 or 3005 Already in Use

**Error:** `EADDRINUSE: address already in use :::3002`

**Solution:**
```bash
# Find process using the port
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3002 | xargs kill -9
```

### Issue: Migration Fails with Foreign Key Error

**Error:** `relation "accounts" does not exist`

**Solution:**
Ensure migrations run in the correct order (see Database Setup step 2).

```bash
# Drop database and start fresh
dropdb bestadsup
createdb bestadsup

# Run migrations in order
psql bestadsup < database/schema.sql
psql bestadsup < database/verification-system-migration.sql
# ... etc
```

### Issue: JWT Token Errors

**Error:** `JsonWebTokenError: invalid signature`

**Solution:**
Ensure `JWT_SECRET` in `.env` is at least 32 characters and matches between backend and frontend.

```bash
# Generate a new secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET=<generated-secret>

# Restart server
npm run dev
```

### Issue: Stripe Webhook Fails Locally

**Error:** `No signatures found matching the expected signature`

**Solution:**
Use Stripe CLI to forward webhooks to localhost.

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3002/api/v1/webhooks/stripe

# Copy webhook signing secret (whsec_...)
# Update STRIPE_WEBHOOK_SECRET in .env
```

### Issue: Google OAuth Redirect Mismatch

**Error:** `redirect_uri_mismatch`

**Solution:**
Ensure redirect URI in Google Cloud Console matches exactly:

```
http://localhost:3005/verification/callback
```

No trailing slash, correct port (3005 not 3002).

### Issue: npm install Fails

**Error:** `ERESOLVE unable to resolve dependency tree`

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

### Issue: Frontend Shows Blank Page

**Possible Causes:**
1. Backend API not running
2. CORS error
3. Environment variable mismatch

**Solution:**
```bash
# Check backend is running
curl http://localhost:3002/health

# Check browser console for errors (F12)
# Common fix: Update FRONTEND_URL in backend .env
FRONTEND_URL=http://localhost:3005
```

---

## Common Development Tasks

### Create a New Migration

```sql
-- database/my-new-migration.sql
-- Description of migration

CREATE TABLE IF NOT EXISTS my_table (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE my_table IS 'Purpose of this table';
```

Run it:
```bash
psql bestadsup < database/my-new-migration.sql
```

### Reset Database (Start Fresh)

```bash
# WARNING: Deletes all data!
dropdb bestadsup
createdb bestadsup
npm run migrate  # Or run migrations manually
```

### Test API Endpoints

```bash
# Using curl
curl -X POST http://localhost:3002/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User","account_type":"creator"}'

# Or use Postman/Insomnia
# Import collection: docs/postman-collection.json
```

### View Logs

```bash
# Backend logs
cd services/control-plane
npm run dev  # Logs to console

# Frontend logs
# Open browser console (F12)

# PostgreSQL query logs
# Edit postgresql.conf
log_statement = 'all'
# Restart PostgreSQL
```

---

## Next Steps

1. ✅ Complete environment setup
2. ✅ Run migrations
3. ✅ Verify application runs
4. 📖 Read [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for API documentation
5. 📖 Read [PRD.md](./PRD.md) for product context
6. 🚀 Start Sprint 1 tasks (see [SPRINT_1_PLAN.md](./SPRINT_1_PLAN.md))

---

## Need Help?

- **Technical Issues:** Open GitHub issue with logs and error messages
- **Architecture Questions:** See [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)
- **Product Questions:** See [PRD.md](./PRD.md)
- **Database Schema:** See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Maintained By:** Engineering Team
