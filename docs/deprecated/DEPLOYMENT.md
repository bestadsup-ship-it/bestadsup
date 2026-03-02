# Deployment Guide

This guide covers deploying the B2B Ad Platform to various cloud providers.

## Architecture Overview

The platform consists of:
- **Frontend (Dashboard)** - Best for: Netlify, Vercel
- **Backend Services** - Best for: Railway, Render, AWS ECS, Google Cloud Run
- **Database** - PostgreSQL on: Railway, Supabase, AWS RDS
- **Cache** - Redis on: Railway, Redis Cloud, AWS ElastiCache

---

## Deploy Dashboard to Netlify

### Option 1: Deploy via Netlify CLI (Recommended)

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Login to Netlify**
```bash
netlify login
```

3. **Initialize Netlify site**
```bash
netlify init
```

Follow the prompts:
- Create & configure a new site
- Team: Select your team
- Site name: bestadsup-dashboard
- Build command: `cd packages/dashboard && npm install && npm run build`
- Publish directory: `packages/dashboard/dist`

4. **Set environment variables**
```bash
netlify env:set REACT_APP_CONTROL_PLANE_URL "https://your-api-url.com"
netlify env:set REACT_APP_REPORTING_URL "https://your-reporting-url.com"
```

5. **Deploy**
```bash
netlify deploy --prod
```

### Option 2: Deploy via GitHub Integration

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Click "Add new site" → "Import an existing project"**
3. **Connect to GitHub** and select `bestadsup-ship-it/bestadsup`
4. **Configure build settings**:
   - Base directory: `packages/dashboard`
   - Build command: `npm install && npm run build`
   - Publish directory: `packages/dashboard/dist`
5. **Add environment variables**:
   - `REACT_APP_CONTROL_PLANE_URL`
   - `REACT_APP_REPORTING_URL`
6. **Click "Deploy site"**

### Option 3: Manual Deploy via Netlify Drop

1. **Build locally**
```bash
cd packages/dashboard
npm install
npm run build
```

2. **Go to**: https://app.netlify.com/drop
3. **Drag and drop** the `packages/dashboard/dist` folder

---

## Deploy Backend Services

### Option 1: Railway (Recommended - Easy & Fast)

Railway provides PostgreSQL, Redis, and container hosting.

**1. Install Railway CLI**
```bash
npm install -g @railway/cli
```

**2. Login**
```bash
railway login
```

**3. Create new project**
```bash
railway init
```

**4. Add PostgreSQL**
```bash
railway add --plugin postgresql
```

**5. Add Redis**
```bash
railway add --plugin redis
```

**6. Deploy each service**

Create `railway.json` in project root:
```json
{
  "deploy": {
    "services": [
      {
        "name": "ad-server",
        "dockerfile": "services/ad-server/Dockerfile",
        "port": 3001
      },
      {
        "name": "control-plane",
        "dockerfile": "services/control-plane/Dockerfile",
        "port": 3002
      },
      {
        "name": "analytics-ingest",
        "dockerfile": "services/analytics-ingest/Dockerfile",
        "port": 3003
      },
      {
        "name": "reporting-api",
        "dockerfile": "services/reporting-api/Dockerfile",
        "port": 3004
      }
    ]
  }
}
```

**7. Set environment variables for each service**
```bash
# Get DATABASE_URL from Railway
railway variables

# Set for each service
railway variables set JWT_SECRET=your-secret-here
railway variables set NODE_ENV=production
```

**8. Deploy**
```bash
railway up
```

**9. Initialize database**
```bash
railway run psql $DATABASE_URL -f database/schema.sql
railway run psql $DATABASE_URL -f database/seed.sql
```

### Option 2: Render

**1. Create account** at https://render.com

**2. Create PostgreSQL database**
- Dashboard → New → PostgreSQL
- Name: bestadsup-db
- Copy connection string

**3. Create Redis instance**
- Dashboard → New → Redis
- Name: bestadsup-cache
- Copy connection string

**4. Deploy each service**

For each service (ad-server, control-plane, analytics-ingest, reporting-api):
- Dashboard → New → Web Service
- Connect your GitHub repo
- Configure:
  - Name: bestadsup-{service-name}
  - Environment: Docker
  - Dockerfile path: services/{service-name}/Dockerfile
  - Add environment variables

**5. Initialize database**
```bash
psql postgresql://your-connection-string -f database/schema.sql
psql postgresql://your-connection-string -f database/seed.sql
```

### Option 3: AWS (Production-Grade)

See AWS deployment guide in `docs/aws-deployment.md`

---

## Complete Deployment Workflow

### Step 1: Deploy Database & Cache

Choose one:
- **Railway**: Includes PostgreSQL + Redis
- **Supabase**: PostgreSQL with built-in auth
- **AWS RDS + ElastiCache**: Production-grade

### Step 2: Initialize Database

```bash
# Using Railway
railway run psql $DATABASE_URL -f database/schema.sql
railway run psql $DATABASE_URL -f database/seed.sql

# Using connection string
psql "postgresql://user:pass@host:5432/db" -f database/schema.sql
psql "postgresql://user:pass@host:5432/db" -f database/seed.sql
```

### Step 3: Deploy Backend Services

Deploy to Railway, Render, or AWS:
- ad-server
- control-plane
- analytics-ingest
- reporting-api

### Step 4: Note Service URLs

After deployment, you'll have URLs like:
- Ad Server: `https://ad-server.railway.app`
- Control Plane: `https://control-plane.railway.app`
- Analytics: `https://analytics.railway.app`
- Reporting: `https://reporting.railway.app`

### Step 5: Update Dashboard Environment Variables

In Netlify dashboard:
```
REACT_APP_CONTROL_PLANE_URL=https://control-plane.railway.app
REACT_APP_REPORTING_URL=https://reporting.railway.app
```

### Step 6: Deploy Dashboard to Netlify

```bash
netlify deploy --prod
```

### Step 7: Update CORS Settings

In each backend service's environment variables:
```
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
```

Redeploy backend services.

### Step 8: Test End-to-End

1. Visit your Netlify dashboard URL
2. Sign up / log in
3. Create property, ad units, campaigns
4. Test ad serving

---

## Environment Variables Reference

### Dashboard (Netlify)
```
REACT_APP_CONTROL_PLANE_URL=https://your-control-plane-url
REACT_APP_REPORTING_URL=https://your-reporting-url
```

### Backend Services
```
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key-change-this
NODE_ENV=production
PORT=3001 (or 3002, 3003, 3004)
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
ANALYTICS_INGEST_URL=https://analytics.railway.app (for ad-server)
```

---

## Custom Domain Setup

### Netlify (Dashboard)
1. Netlify Dashboard → Domain settings
2. Add custom domain
3. Update DNS with Netlify nameservers or CNAME

### Railway (Backend)
1. Railway Dashboard → Settings → Domains
2. Add custom domain
3. Update DNS CNAME to point to Railway

---

## Monitoring & Logs

### Netlify
- Deploy logs: Netlify Dashboard → Deploys
- Function logs: Netlify Dashboard → Functions

### Railway
```bash
railway logs
```

Or in Railway Dashboard → Deployments → Logs

### Render
Render Dashboard → Logs tab

---

## Quick Deploy Checklist

- [ ] Create Netlify account
- [ ] Create Railway/Render account
- [ ] Deploy PostgreSQL database
- [ ] Deploy Redis cache
- [ ] Initialize database schema
- [ ] Load seed data
- [ ] Deploy ad-server
- [ ] Deploy control-plane
- [ ] Deploy analytics-ingest
- [ ] Deploy reporting-api
- [ ] Note all service URLs
- [ ] Update dashboard environment variables
- [ ] Deploy dashboard to Netlify
- [ ] Update CORS settings
- [ ] Test end-to-end
- [ ] Set up custom domains (optional)

---

## Cost Estimates

### Free Tier Deployment
- Netlify: Free (100GB bandwidth)
- Railway: $5/month (starter plan)
- **Total: ~$5/month**

### Production Deployment
- Netlify Pro: $19/month
- Railway Pro: $20/month
- AWS (moderate traffic): $50-100/month
- **Total: $40-140/month**

---

## Troubleshooting

### Dashboard not connecting to API
- Check environment variables in Netlify
- Verify CORS settings in backend
- Check network tab for errors

### Database connection failed
- Verify DATABASE_URL is correct
- Check database is running
- Verify network access/firewall

### Redis connection failed
- Verify REDIS_URL is correct
- Check Redis is running
- Verify network access

### CORS errors
- Add dashboard URL to ALLOWED_ORIGINS
- Redeploy backend services

---

For more help, see:
- Netlify Docs: https://docs.netlify.com
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
