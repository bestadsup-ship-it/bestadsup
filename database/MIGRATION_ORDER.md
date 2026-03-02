# Database Migration Order
## BestAdsUp - Verified Performance Marketing Marketplace

**Last Updated:** February 28, 2026

---

## ✅ Active Migrations (Use These)

Run migrations in this **EXACT** order to avoid foreign key errors:

### 1. Base Schema (REQUIRED)
**File:** `schema.sql`
**Purpose:** Core tables (accounts, posts, products)
**Tables Created:**
- `accounts` - User accounts
- `posts` - Content posts
- `products` - Service listings
- Base indexes and constraints

```bash
psql bestadsup < database/schema.sql
```

---

### 2. Auth Security (Optional)
**File:** `auth-security-migration.sql`
**Purpose:** Rate limiting, session management
**Tables Created:**
- Session tracking
- Rate limit logs

```bash
psql bestadsup < database/auth-security-migration.sql
```

---

### 3. Verification System (REQUIRED)
**File:** `verification-system-migration.sql`
**Purpose:** Third-party verification of marketing results
**Tables Created:**
- `verification_connections` - OAuth to GA4/HubSpot/Stripe
- `verification_data` - Verified metrics
- `verification_badges` - Creator badges
- `verification_requests` - Manual verification
- `verification_sync_log` - Audit trail

**Key Features:**
- Auto-grant badges when >= 3 verified metrics
- Update account verification status triggers
- Views for creator verification summary

```bash
psql bestadsup < database/verification-system-migration.sql
```

---

### 4. Escrow Payments (REQUIRED)
**File:** `escrow-payments-migration.sql`
**Purpose:** Stripe Connect escrow-based payments
**Tables Created:**
- `escrow_accounts` - Stripe Connect accounts
- `escrow_transactions` - Milestone payments
- `payment_methods` - Buyer payment methods
- `payout_schedule` - Creator payouts
- `escrow_events_log` - Compliance audit

**Key Features:**
- Auto-calculate fees (15% + Stripe)
- Auto-release escrow after X days
- Row-level security policies

```bash
psql bestadsup < database/escrow-payments-migration.sql
```

---

### 5. Project Management (REQUIRED)
**File:** `project-management-migration.sql`
**Purpose:** Milestone-based project tracking
**Tables Created:**
- `projects` - Main project table
- `project_milestones` - 50% upfront, 50% completion
- `project_deliverables` - Creator submissions
- `project_activity_log` - Timeline
- `project_messages` - Communication

**Key Features:**
- Auto-approve milestones after 7 days
- Auto-update project status
- Views for overdue milestones, creator stats

```bash
psql bestadsup < database/project-management-migration.sql
```

---

### 6. Shop/Marketplace (Optional)
**File:** `shop.sql`
**Purpose:** Service packages and marketplace
**Tables Created:**
- Enhanced product features
- Shopping cart (if needed)

```bash
psql bestadsup < database/shop.sql
```

---

### 7. B2B Profile Enhancements (Optional)
**File:** `b2b-profile-migration.sql`
**Purpose:** Enhanced creator/buyer profiles
**Tables Created:**
- Additional profile fields
- Portfolio features

```bash
psql bestadsup < database/b2b-profile-migration.sql
```

---

## 🚀 Quick Start (All Migrations)

Run all migrations in correct order:

```bash
# Option 1: Use the migration script (RECOMMENDED)
npm run migrate

# Option 2: Run manually
psql bestadsup < database/schema.sql
psql bestadsup < database/verification-system-migration.sql
psql bestadsup < database/escrow-payments-migration.sql
psql bestadsup < database/project-management-migration.sql
psql bestadsup < database/shop.sql
```

---

## ⚠️ Deprecated Migrations (Social Features)

These migrations are from the old "TikTok for B2B" vision and should **NOT** be run for the marketplace platform:

### Moved to `database/deprecated/`:

1. **posts.sql** - Social feed features (deprecated)
2. **engagement.sql** - Likes, follows, comments (deprecated)
3. **comments.sql** - Comment threads (deprecated for social)
4. **messages.sql** - DMs (replaced by project_messages)
5. **notifications.sql** - Social notifications (deprecated)
6. **tags.sql** - Social tagging (deprecated)
7. **admin.sql** - Old admin system (deprecated)
8. **user-types-migration.sql** - Old user types (replaced)
9. **services-marketplace-migration.sql** - Old marketplace (replaced)
10. **portfolio-posts-migration.sql** - Old portfolio (replaced)
11. **saas-niche-migration.sql** - Old niche features (replaced)
12. **seed.sql** - Old test data (replaced)

**Why deprecated?**
These were built for a social network + marketplace hybrid. The new platform is a **pure marketplace** with verification-first approach.

---

## 🔄 Migration Dependencies

```
schema.sql (base tables)
    │
    ├── auth-security-migration.sql
    │
    ├── verification-system-migration.sql
    │       │
    │       └── (depends on accounts table)
    │
    ├── escrow-payments-migration.sql
    │       │
    │       └── (depends on accounts table)
    │
    └── project-management-migration.sql
            │
            ├── (depends on accounts table)
            ├── (depends on products table)
            ├── (depends on verification_data for milestone verification)
            └── (depends on escrow_transactions for payments)
```

**IMPORTANT:** `project-management-migration.sql` MUST run AFTER `verification-system-migration.sql` and `escrow-payments-migration.sql` due to foreign key references.

---

## 📊 Table Count by Migration

| Migration | Tables Created | Triggers | Functions | Views |
|-----------|----------------|----------|-----------|-------|
| schema.sql | 3 | 0 | 0 | 0 |
| verification-system-migration.sql | 5 | 4 | 2 | 2 |
| escrow-payments-migration.sql | 5 | 4 | 3 | 3 |
| project-management-migration.sql | 5 | 3 | 3 | 3 |
| **TOTAL** | **18** | **11** | **8** | **8** |

---

## 🧪 Testing Migrations

### Verify All Tables Exist:

```bash
npm run migrate:verify

# Or manually:
psql bestadsup -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```

### Expected Tables (After All Migrations):

```
accounts
escrow_accounts
escrow_events_log
escrow_transactions
payment_methods
payout_schedule
posts
products
project_activity_log
project_deliverables
project_messages
project_milestones
projects
verification_badges
verification_connections
verification_data
verification_requests
verification_sync_log
```

### Verify Foreign Keys:

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

---

## 🔧 Troubleshooting

### Error: "relation does not exist"
**Cause:** Migrations run out of order
**Fix:** Drop database and run migrations in correct order
```bash
dropdb bestadsup
createdb bestadsup
npm run migrate
```

### Error: "violates foreign key constraint"
**Cause:** Trying to insert data before dependencies exist
**Fix:** Ensure migrations run BEFORE seeding data

### Error: "permission denied"
**Cause:** Database user lacks permissions
**Fix:**
```sql
GRANT ALL PRIVILEGES ON DATABASE bestadsup TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

### Migration Already Run?
Check if tables exist:
```bash
psql bestadsup -c "\dt"
```

To reset (WARNING: Deletes all data):
```bash
npm run db:reset
```

---

## 📝 Adding New Migrations

1. Create file: `database/your-migration-name.sql`
2. Add to `scripts/run-all-migrations.js` in correct order
3. Document in this file (MIGRATION_ORDER.md)
4. Test on fresh database:
   ```bash
   npm run db:reset
   ```
5. Update HANDOFF_STATUS.md if critical

---

## 🎯 Production Deployment

### First Deployment:
```bash
# 1. Create production database
createdb bestadsup_prod

# 2. Set DATABASE_URL in production .env
DATABASE_URL=postgresql://user:pass@host:5432/bestadsup_prod

# 3. Run migrations
npm run migrate

# 4. Verify
npm run migrate:verify
```

### Subsequent Deployments:
- Only run NEW migrations
- Never drop/recreate production database
- Always backup before migration:
  ```bash
  pg_dump bestadsup_prod > backup_$(date +%Y%m%d).sql
  ```

---

## 📚 Related Documentation

- [DEVELOPER_SETUP.md](../DEVELOPER_SETUP.md) - Full setup guide
- [TECHNICAL_SPEC.md](../TECHNICAL_SPEC.md) - API specifications
- [PRD.md](../PRD.md) - Product requirements
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - ERD diagrams (coming soon)

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Maintained By:** Engineering Team
