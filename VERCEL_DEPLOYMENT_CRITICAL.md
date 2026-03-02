# ⚠️ CRITICAL: Vercel Deployment Instructions

## DO NOT Deploy from Repository Root

This is a **monorepo** with separate frontend and backend applications. You **MUST** deploy as **two separate Vercel projects**.

### ❌ WRONG (causes build errors):
- Deploying from repository root
- Using "Import Git Repository" and accepting defaults
- Trying to build entire monorepo as one project

### ✅ CORRECT:

Deploy **TWO SEPARATE PROJECTS** in Vercel:

---

## Project 1: Backend API

1. **Import Repository:** https://github.com/bestadsup/bestadsup
2. **Configure Project:**
   ```
   Project Name: bestadsup-api
   Framework Preset: Other
   Root Directory: services/control-plane
   Build Command: npm install && npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Environment Variables:** Add all backend vars (see `docs/VERCEL_DEPLOYMENT.md`)

4. **Deploy**

---

## Project 2: Frontend Dashboard

1. **Import Same Repository:** https://github.com/bestadsup/bestadsup
2. **Configure Project:**
   ```
   Project Name: bestadsup-dashboard
   Framework Preset: Other
   Root Directory: packages/dashboard
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Environment Variables:**
   ```bash
   REACT_APP_API_BASE_URL=https://bestadsup-api.vercel.app/api/v1
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

4. **Deploy**

---

## Why Two Projects?

- **Independent scaling** - Frontend and backend scale separately
- **Custom domains** - Different URLs for app and API
- **Build optimization** - Static frontend, serverless backend
- **Correct build process** - Each project has its own build config

---

## What Went Wrong?

If you deployed from the root and got this error:

```
Error: Service account object must contain a string "project_id" property.
Error: Failed to collect page data for /api/sessionLogin
```

**Cause:** Vercel detected Next.js dependencies in root `package.json` (from workspaces) and tried to build the entire repo as a Next.js project. This fails because:
1. This isn't a Next.js app (it's React + Express)
2. Root doesn't have proper build configuration
3. Firebase service account isn't configured

**Fix:** Delete the failed deployment and follow the two-project setup above.

---

## Complete Guides

- **Quick Start (30 min):** `VERCEL_QUICKSTART.md`
- **Full Guide:** `docs/VERCEL_DEPLOYMENT.md`

---

## Need Help?

If you already deployed incorrectly:
1. Go to Vercel Dashboard → Settings → Delete Project
2. Follow the two-project setup above
3. Ensure "Root Directory" is set to the correct subfolder for each project
