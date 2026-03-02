# Quick Start Guide
## BestAdsUp - Get Running in 10 Minutes

**Last Updated:** February 28, 2026

---

## 🎯 What You'll Build

The **ONLY** marketplace where SaaS marketing results are third-party verified before payment.

**Key Features:**
- ✅ Third-party verification via Google Analytics 4, HubSpot, Stripe
- ✅ Escrow-based milestone payments
- ✅ Project management system
- ✅ Verification badges for creators

---

## ⚡ Prerequisites

Before starting, install:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 15+** - [Download](https://postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/downloads)

Optional (for OAuth):
- **Google Cloud account** - [Sign up](https://console.cloud.google.com/)
- **Stripe account** - [Sign up](https://stripe.com/)

---

## 🚀 Setup (3 Steps)

### Step 1: Clone & Install (2 min)

```bash
cd C:\Users\percy\B2BAdSite
npm install
```

### Step 2: Database Setup (3 min)

```bash
# Create database
createdb bestadsup

# Copy environment file
cp .env.example .env

# Run migrations (creates all tables)
npm run migrate
```

**Expected output:**
```
✅ Successful: 5
❌ Failed: 0
⚠️  Skipped: 2
🎉 All migrations completed successfully!
```

### Step 3: Start Dev Servers (1 min)

```bash
npm run dev
```

**You should see:**
```
Backend running: http://localhost:3002
Frontend running: http://localhost:3005
```

---

## ✅ Verify It Works

1. **Open browser:** http://localhost:3005
2. **Sign up** as a Creator or Buyer
3. **Check database:**
   ```bash
   psql bestadsup -c "SELECT * FROM accounts;"
   ```

---

## 📊 What's In The Database?

After migrations, you'll have **18 tables**:

### Core Tables:
- `accounts` - Users (Creators & Buyers)
- `products` - Service listings
- `posts` - Content/portfolio

### Verification System:
- `verification_connections` - OAuth to GA4/HubSpot/Stripe
- `verification_data` - Verified metrics
- `verification_badges` - Creator badges

### Escrow Payments:
- `escrow_accounts` - Stripe Connect accounts
- `escrow_transactions` - Milestone payments
- `payment_methods` - Buyer payment methods

### Project Management:
- `projects` - Main project table
- `project_milestones` - 50% upfront, 50% completion
- `project_deliverables` - Creator submissions
- `project_messages` - Communication

---

## 🔧 Common Issues

### Issue: "createdb: command not found"
**Fix:** Add PostgreSQL to PATH or use full path:
```bash
C:\Program Files\PostgreSQL\15\bin\createdb bestadsup
```

### Issue: "relation 'accounts' does not exist"
**Fix:** Run migrations:
```bash
npm run migrate
```

### Issue: Port 3002 already in use
**Fix:** Kill existing process:
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3002 | xargs kill -9
```

### Issue: Database connection failed
**Fix:** Check .env file has correct DATABASE_URL:
```env
DATABASE_URL=postgresql://localhost:5432/bestadsup
```

---

## 📚 Next Steps

### For Developers:
1. ✅ **Read [PRD.md](./PRD.md)** - Understand product vision (20 pages)
2. ✅ **Read [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)** - API specifications (16 pages)
3. ✅ **Read [SPRINT_1_PLAN.md](./SPRINT_1_PLAN.md)** - Sprint 1 tasks (25 pages)
4. ✅ **Review [database/DATABASE_SCHEMA.md](./database/DATABASE_SCHEMA.md)** - Schema with ERD diagrams

### For Setting Up OAuth:
1. ✅ **Read [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)** - Google, HubSpot, Stripe setup

### For Production:
1. ✅ **Read [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md)** - Full deployment guide

---

## 🎯 Test The Core Features

### 1. Create an Account
```bash
# Sign up as Creator
curl -X POST http://localhost:3002/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@example.com",
    "password": "SecurePass123!",
    "name": "Test Creator",
    "account_type": "creator"
  }'
```

### 2. Verify Database
```bash
psql bestadsup -c "SELECT id, email, name, account_type FROM accounts;"
```

### 3. Check Verification Tables
```bash
psql bestadsup -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```

**Expected:** 18 tables listed

---

## 📖 Documentation Index

| Document | Purpose | Pages |
|----------|---------|-------|
| [README.md](./README.md) | Platform overview | 1 |
| [PRD.md](./PRD.md) | Product requirements | 20 |
| [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) | API specifications | 16 |
| [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) | Full setup guide | 12 |
| [SPRINT_1_PLAN.md](./SPRINT_1_PLAN.md) | Sprint 1 tasks | 25 |
| [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) | OAuth integrations | 18 |
| [DATABASE_SCHEMA.md](./database/DATABASE_SCHEMA.md) | Schema + ERD | 20 |
| [MIGRATION_ORDER.md](./database/MIGRATION_ORDER.md) | Migration guide | 8 |
| [HANDOFF_STATUS.md](./HANDOFF_STATUS.md) | Current status | 1 |

**Total:** 109+ pages of documentation

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev              # Start both servers
npm run dev:backend      # Backend only (port 3002)
npm run dev:frontend     # Frontend only (port 3005)

# Database
npm run migrate          # Run all migrations
npm run migrate:verify   # Check which tables exist
npm run db:reset         # Fresh database (WARNING: deletes data)

# Testing
npm test                 # Run all tests
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only

# Production
npm run build            # Build for production
npm start                # Start production server
```

---

## 🎉 You're Ready!

Your BestAdsUp development environment is set up!

**What's working:**
- ✅ Backend API (port 3002)
- ✅ Frontend dashboard (port 3005)
- ✅ PostgreSQL database with 18 tables
- ✅ Verification system (ready for OAuth)
- ✅ Escrow payments (ready for Stripe)
- ✅ Project management

**Next:**
- Start Sprint 1 tasks from [SPRINT_1_PLAN.md](./SPRINT_1_PLAN.md)
- Set up OAuth for verification features
- Build out creator/buyer dashboards

---

## 📞 Need Help?

**Documentation:**
- [Full setup guide](./DEVELOPER_SETUP.md)
- [Technical spec](./TECHNICAL_SPEC.md)
- [Database schema](./database/DATABASE_SCHEMA.md)

**Common Questions:**
- **"How do I set up Google Analytics verification?"** → See [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md#google-analytics-4)
- **"What's the database structure?"** → See [DATABASE_SCHEMA.md](./database/DATABASE_SCHEMA.md)
- **"What should I build first?"** → See [SPRINT_1_PLAN.md](./SPRINT_1_PLAN.md)

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Status:** Ready for development
