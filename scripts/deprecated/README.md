# Deprecated Scripts
## BestAdsUp - Archived Migration and Utility Scripts

**Date Archived:** February 28, 2026
**Reason:** Platform pivot from social features to verified marketplace

---

## ⚠️ DO NOT USE THESE SCRIPTS

These scripts reference deprecated database migrations and social features that are **NOT part** of the current platform.

---

## Deprecated Files

### Migration Runners (Old Social Features):
- **run-engagement-migration.js** - Social engagement (likes, follows)
- **run-messages-migration.js** - Direct messaging system
- **run-tags-migration.js** - Hashtag and tagging system
- **run-auth-security-migration.js** - Old auth system
- **run-b2b-profile-migration.js** - Old profile system
- **run-platform-migrations.js** - Old platform setup
- **run-saas-niche-migration.js** - Old SaaS features
- **run-migrations.js** - Old migration runner (replaced by run-all-migrations.js)

### Table Check Scripts:
- **check-engagement-tables.js** - Verify engagement tables exist
- **check-notifications-table.js** - Verify notifications table exists
- **check-posts-table.js** - Verify posts table exists (social posts)

### Admin Scripts:
- **set-admin.js** - Set single user as admin
- **set-all-admin.js** - Set all users as admin

---

## Why Were These Deprecated?

### Platform Evolution:

**V1: Social Network + Marketplace (Deprecated)**
- Users posted content like LinkedIn
- Followed other users
- Liked and commented on posts
- Direct messaging between users
- Hashtags for discovery

**V2: Verified Performance Marketplace (Current)**
- Marketplace for hiring verified marketers
- Third-party verification (no social features)
- Project-based communication (not DMs)
- Verification badges (not followers)

**Key Change:** Removed ALL social features to focus on verification-first marketplace.

---

## Current Scripts (Use These Instead)

Located in `scripts/` root directory:

### ✅ **run-all-migrations.js** (CURRENT)
Runs all marketplace migrations in correct order:
```bash
npm run migrate
```

Migrations included:
1. schema.sql - Base tables
2. verification-system-migration.sql - OAuth verification
3. escrow-payments-migration.sql - Stripe Connect
4. project-management-migration.sql - Projects
5. shop.sql - Marketplace features (optional)
6. b2b-profile-migration.sql - Profiles (optional)

### ✅ **check-accounts.js**
Verify accounts table and data

### ✅ **check-accounts-schema.js**
Verify accounts table schema

### ✅ **init-db.sh / init-db.bat**
Database initialization scripts

---

## Migration Path

If you have a database with old social features:

### Option 1: Fresh Start (RECOMMENDED)
```bash
# Backup old data
pg_dump old_database > backup.sql

# Drop and recreate
dropdb bestadsup
createdb bestadsup

# Run new migrations
npm run migrate
```

### Option 2: Manual Cleanup (Advanced)
See `database/deprecated/README.md` for table drop instructions.

---

## What Replaced These Features?

| Old Feature | Deprecated Script | New Replacement | Current Implementation |
|-------------|-------------------|-----------------|------------------------|
| Social posts | run-engagement-migration.js | Verification data | verification_data table |
| Direct messages | run-messages-migration.js | Project messages | project_messages table |
| Hashtags | run-tags-migration.js | Service categories | products.category |
| Followers | run-engagement-migration.js | Verification badges | verification_badges |
| Notifications | (no script) | Project activity | project_activity_log |

---

## For New Developers

**Ignore this entire folder.** Use the current scripts in the parent directory:

```bash
# Initialize database
npm run db:create

# Run all migrations
npm run migrate

# Verify setup
npm run migrate:verify

# Start development
npm run dev
```

See [QUICKSTART.md](../../QUICKSTART.md) for full setup guide.

---

## Related Documentation

- [Current Scripts](../) - Active migration scripts
- [Database Migrations](../../database/) - Current SQL migrations
- [Deprecated Migrations](../../database/deprecated/README.md) - Archived SQL files
- [MIGRATION_ORDER.md](../../database/MIGRATION_ORDER.md) - Migration execution order
- [DEVELOPER_SETUP.md](../../DEVELOPER_SETUP.md) - Setup guide

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Status:** Archived for historical reference only
