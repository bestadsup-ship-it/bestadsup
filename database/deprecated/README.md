# Deprecated Migrations
## BestAdsUp - Archived Social Features

**Date Archived:** February 28, 2026
**Reason:** Platform pivot from "TikTok for B2B" to "Verified Performance Marketplace"

---

## ⚠️ DO NOT USE THESE MIGRATIONS

These files are from the old product vision and are **NOT compatible** with the current marketplace platform.

---

## Why Were These Deprecated?

### Old Vision (Deprecated):
**"TikTok meets LinkedIn for B2B Marketing"**
- Social feed with posts, likes, follows
- Content discovery algorithm
- Engagement metrics (views, likes, comments)
- Direct messaging between users
- Social notifications

### New Vision (Current):
**"Verified Performance Marketing Marketplace for SaaS"**
- Marketplace for hiring verified marketers
- Third-party verification of results (GA4, HubSpot)
- Escrow-based milestone payments
- Project management system
- Verification badges

**Key Difference:** Old platform was social-first with marketplace. New platform is marketplace-only with verification-first approach.

---

## Deprecated Files

### Social Feed Features:
- `posts.sql` - Social posts, likes, shares (60% of users didn't engage)
- `engagement.sql` - Follower system, post interactions
- `comments.sql` - Comment threads on posts
- `tags.sql` - Hashtag and tagging system

### Communication:
- `messages.sql` - Direct messaging (replaced by `project_messages` in project-management-migration.sql)
- `notifications.sql` - Social notifications (likes, follows, mentions)

### Old Marketplace Attempts:
- `services-marketplace-migration.sql` - First marketplace attempt (replaced by escrow + projects)
- `portfolio-posts-migration.sql` - Portfolio as posts (replaced by verification_data)
- `user-types-migration.sql` - Old creator/buyer types (replaced by account_type in schema)
- `saas-niche-migration.sql` - SaaS niche features (integrated into new schema)

### Other:
- `admin.sql` - Old admin panel (needs rebuild for marketplace)
- `seed.sql` - Test data for social features (replaced by new seed data)

---

## Migration Path (If Needed)

If you have an existing database with these tables and want to migrate to the new schema:

### Option 1: Fresh Start (RECOMMENDED)
```bash
# Backup old data if needed
pg_dump old_database > backup_social_features.sql

# Drop old database
dropdb old_database

# Create new database
createdb bestadsup

# Run new migrations
npm run migrate
```

### Option 2: Selective Drop (Advanced)
```sql
-- Drop social feature tables (data will be lost)
DROP TABLE IF EXISTS engagement CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;

-- Then run new migrations
-- npm run migrate
```

---

## What Replaced These Features?

| Old Feature | Deprecated Table | New Replacement | New Table |
|-------------|------------------|-----------------|-----------|
| Social posts | `posts` | Portfolio/case studies | `verification_data` + `posts` (repurposed) |
| Follower system | `user_follows` | Verification badges | `verification_badges` |
| Likes/comments | `engagement`, `comments` | Project reviews | `projects.buyer_review`, `projects.creator_review` |
| Direct messages | `messages` | Project communication | `project_messages` |
| Social notifications | `notifications` | Project activity | `project_activity_log` |
| Hashtags | `tags` | Service categories | `products.category` |
| Old marketplace | `service_orders` | Project milestones | `projects`, `project_milestones` |

---

## Data That Can Be Migrated

If you have valuable data from the old schema:

### Accounts
✅ **Can migrate:** User accounts, emails, passwords
```sql
-- Accounts table structure is mostly compatible
-- Just need to add account_type
UPDATE accounts SET account_type = 'creator' WHERE user_id IN (...);
```

### Products/Services
✅ **Can migrate:** Service listings
```sql
-- Products table exists in both schemas
-- May need to add new columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(50);
```

### Posts (Selective)
⚠️ **Partial migration:** Portfolio posts only
```sql
-- Migrate portfolio posts, ignore social posts
-- Use verification_data for verified case studies instead
```

### Cannot Migrate:
- ❌ Social engagement data (likes, follows, shares)
- ❌ Comments and replies
- ❌ Direct messages (use project_messages going forward)
- ❌ Notifications
- ❌ Hashtags and tags

---

## Historical Context

### Timeline:
- **Jan 2026:** Platform started as "TikTok for B2B"
- **Feb 15, 2026:** User research showed social features had low engagement
- **Feb 20, 2026:** Market research identified verification gap
- **Feb 28, 2026:** Pivot to "Verified Performance Marketplace"

### Research Findings (Why We Pivoted):
1. **60% of users** didn't engage with social feed
2. **SaaS founders** wanted hiring tools, not social browsing
3. **38% of B2B marketers** cited ROI measurement as #1 pain point
4. **No competitor** verified marketing results before payment
5. **Fiverr/Upwork quality collapse** created market opportunity

See [PRD.md](../../PRD.md) for full market analysis.

---

## Future Considerations

### Could These Features Return?
Maybe in Phase 3+ as optional enhancements:

- **Creator community forum** - Replace social feed with focused discussions
- **Case study showcase** - Use verification_data instead of posts
- **Testimonials** - Already in projects table as reviews
- **Messaging** - Already exists as project_messages

But **NOT as core features**. Marketplace + verification come first.

---

## Questions?

**Why keep these files if deprecated?**
- Historical reference
- Learning from past decisions
- Potential data recovery if needed

**Can I still run these migrations?**
No - they will conflict with new schema. Use new migrations only.

**What if I already have data in these tables?**
See "Migration Path" above. Recommended: fresh start.

---

## Related Documentation

- [MIGRATION_ORDER.md](../MIGRATION_ORDER.md) - Current migration order
- [PRD.md](../../PRD.md) - Why we pivoted
- [TECHNICAL_SPEC.md](../../TECHNICAL_SPEC.md) - New architecture
- [HANDOFF_STATUS.md](../../HANDOFF_STATUS.md) - Current project status

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Status:** Archived
