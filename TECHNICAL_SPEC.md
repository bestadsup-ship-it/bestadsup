# Technical Specification
## BestAdsUp - Verified Performance Marketing Marketplace

**Version:** 1.0
**Date:** February 28, 2026
**For:** Development Team
**Status:** Pre-Development

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [API Specifications](#3-api-specifications)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Database Schema](#5-database-schema)
6. [Third-Party Integrations](#6-third-party-integrations)
7. [Security Requirements](#7-security-requirements)
8. [Performance & Scalability](#8-performance--scalability)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌──────────────┐
│   Client     │  React SPA (port 3005)
│  (Browser)   │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────────────────────────────────┐
│      API Gateway / Load Balancer         │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│     Node.js / Express Backend            │
│         (port 3002)                      │
├──────────────────────────────────────────┤
│  Auth │ Verification │ Escrow │ Projects │
└──────────────────────────────────────────┘
       │
       ├─────────────┬──────────────┬───────────────┐
       ▼             ▼              ▼               ▼
   ┌─────────┐  ┌────────┐    ┌─────────┐    ┌─────────┐
   │PostgreSQL│  │ Redis  │    │ Stripe  │    │  GA4    │
   │   DB    │  │ Cache  │    │ Connect │    │  API    │
   └─────────┘  └────────┘    └─────────┘    └─────────┘
```

### 1.2 Deployment Architecture

**Development:**
- Frontend: localhost:3005 (Webpack Dev Server)
- Backend: localhost:3002 (tsx watch)
- Database: localhost:5432 (PostgreSQL)

**Production:**
- Frontend: Netlify/Vercel (Static hosting + CDN)
- Backend: AWS Lambda / Railway / Render
- Database: AWS RDS / Railway PostgreSQL
- CDN: CloudFlare

---

## 2. Technology Stack

### 2.1 Frontend
- **Framework:** React 18+
- **Routing:** React Router 6+
- **State Management:** React Context + Hooks
- **HTTP Client:** Axios
- **UI Components:** Custom + Tailwind CSS
- **Charts:** Chart.js (for analytics dashboards)
- **Forms:** React Hook Form
- **Build Tool:** Webpack 5

### 2.2 Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js 4+
- **Language:** TypeScript 5+
- **ORM:** node-postgres (pg) - raw SQL
- **Validation:** Zod
- **Authentication:** JWT (jsonwebtoken)
- **Dev Server:** tsx (hot reload)

### 2.3 Database
- **Primary:** PostgreSQL 15+
- **Caching:** Redis 7+ (optional for MVP)
- **Migrations:** Custom SQL scripts

### 2.4 Third-Party Services
- **Payments:** Stripe Connect
- **Email:** SendGrid
- **Analytics Verification:** Google Analytics 4 API, HubSpot API
- **File Storage:** AWS S3 / Cloudinary
- **Monitoring:** Sentry (error tracking)
- **Metrics:** Mixpanel (product analytics)

---

## 3. API Specifications

### 3.1 Base URL Structure

**Development:** `http://localhost:3002`
**Production:** `https://api.bestadsup.com`

**API Versioning:** `/api/v1/*`

### 3.2 Authentication Endpoints

#### POST `/api/v1/auth/signup`
**Description:** Create new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "account_type": "creator" | "buyer"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "account": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe",
    "account_type": "creator"
  }
}
```

**Errors:**
- `400` - Validation error
- `409` - Email already exists

---

#### POST `/api/v1/auth/login`
**Description:** Authenticate user

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "account": { ... }
}
```

**Errors:**
- `401` - Invalid credentials
- `423` - Account locked (too many failed attempts)

---

### 3.3 Verification Endpoints

#### POST `/api/v1/verification/connect-ga4`
**Description:** Initiate OAuth flow to connect Google Analytics 4

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "redirect_uri": "https://app.bestadsup.com/verification/callback"
}
```

**Response (200):**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

#### GET `/api/v1/verification/callback`
**Description:** OAuth callback handler (redirected from Google)

**Query Params:**
- `code` - Authorization code from Google
- `state` - CSRF token

**Response:** Redirect to dashboard with success/error message

---

#### GET `/api/v1/verification/status`
**Description:** Get verification status for current user

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "has_connections": true,
  "connections": [
    {
      "provider": "google_analytics_4",
      "connected_at": "2026-02-15T10:00:00Z",
      "is_active": true,
      "last_synced_at": "2026-02-28T08:00:00Z"
    }
  ],
  "verified_metrics_count": 5,
  "has_verified_badge": true,
  "verification_level": "verified"
}
```

---

### 3.4 Services Endpoints

#### GET `/api/v1/services`
**Description:** Browse creator services

**Query Params:**
- `category` - Filter by category slug
- `min_price` - Minimum price
- `max_price` - Maximum price
- `verified_only` - Boolean (only show verified creators)
- `sort` - `price_asc`, `price_desc`, `rating`, `newest`
- `limit` - Results per page (default: 20, max: 50)
- `offset` - Pagination offset

**Response (200):**
```json
{
  "services": [
    {
      "id": 456,
      "creator_id": 123,
      "creator_name": "Jane Smith",
      "creator_verified": true,
      "title": "SaaS Content Marketing Package",
      "description": "...",
      "price": 2000.00,
      "delivery_days": 14,
      "avg_rating": 4.8,
      "total_orders": 24,
      "is_available": true
    }
  ],
  "total_count": 127,
  "has_more": true
}
```

---

#### POST `/api/v1/services`
**Description:** Create new service (creators only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "SaaS SEO Package",
  "description": "Complete SEO optimization for SaaS websites",
  "category_id": 3,
  "price": 1500.00,
  "delivery_days": 21,
  "revisions_included": 2,
  "includes": ["Keyword research", "On-page optimization", "Link building"],
  "requirements": ["Website URL", "Target keywords", "Analytics access"]
}
```

**Response (201):**
```json
{
  "service": { ... },
  "message": "Service created successfully"
}
```

**Errors:**
- `403` - Not a creator account
- `400` - Validation errors

---

### 3.5 Projects Endpoints

#### POST `/api/v1/projects`
**Description:** Create new project (buyers only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "service_id": 456,
  "requirements": "Need SEO for our SaaS product targeting B2B marketers",
  "custom_instructions": "Focus on organic traffic growth"
}
```

**Response (201):**
```json
{
  "project": {
    "id": 789,
    "status": "pending",
    "total_amount": 2200.00, // $2000 + 10% buyer fee
    "creator_id": 123,
    "milestones": [
      {
        "milestone_number": 1,
        "title": "Upfront payment (50%)",
        "payment_amount": 1100.00,
        "status": "pending"
      },
      {
        "milestone_number": 2,
        "title": "Completion payment (50%)",
        "payment_amount": 1100.00,
        "status": "pending"
      }
    ]
  },
  "escrow_initiated": true,
  "next_step": "payment_required"
}
```

---

#### PATCH `/api/v1/projects/:id/milestone`
**Description:** Update milestone status

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "milestone_id": 123,
  "action": "submit" | "approve" | "request_revision",
  "notes": "Deliverable completed",
  "deliverables": ["https://s3.amazonaws.com/file1.zip"]
}
```

**Response (200):**
```json
{
  "milestone": {
    "id": 123,
    "status": "submitted",
    "submitted_at": "2026-02-28T10:00:00Z"
  },
  "escrow_status": "held",
  "message": "Milestone submitted for review"
}
```

---

### 3.6 Escrow Endpoints

#### POST `/api/v1/escrow/deposit`
**Description:** Initiate escrow payment for project

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "project_id": 789,
  "payment_method_id": "pm_1234567890", // Stripe payment method ID
  "amount": 1100.00,
  "milestone_id": 123
}
```

**Response (200):**
```json
{
  "transaction_id": 456,
  "status": "held",
  "stripe_payment_intent_id": "pi_1234567890",
  "amount_held": 1100.00,
  "creator_payout": 1045.00, // After fees
  "platform_fee": 33.00,
  "stripe_fee": 22.00,
  "auto_release_at": "2026-03-14T10:00:00Z" // 14 days
}
```

---

#### POST `/api/v1/escrow/release`
**Description:** Release escrow funds to creator

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "transaction_id": 456,
  "reason": "Milestone approved - deliverable meets requirements"
}
```

**Response (200):**
```json
{
  "transaction_id": 456,
  "status": "released",
  "released_at": "2026-02-28T10:30:00Z",
  "stripe_transfer_id": "tr_1234567890",
  "creator_payout": 1045.00
}
```

---

## 4. Authentication & Authorization

### 4.1 JWT Token Structure

**Payload:**
```json
{
  "userId": 123,
  "email": "user@example.com",
  "accountType": "creator",
  "iat": 1709107200,
  "exp": 1709193600
}
```

**Token Expiration:** 24 hours
**Refresh Strategy:** Issue new token on each authenticated request (sliding window)

### 4.2 Authorization Middleware

**Role-Based Access Control:**
```typescript
// Example middleware
const requireCreator = (req, res, next) => {
  if (req.user.accountType !== 'creator') {
    return res.status(403).json({ error: 'Creator account required' });
  }
  next();
};
```

**Routes requiring specific roles:**
- `POST /services` - Creators only
- `POST /projects` - Buyers only
- `POST /verification/*` - Creators only
- `GET /dashboard/earnings` - Creators only

### 4.3 Security Headers

Required headers on all API responses:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## 5. Database Schema

### 5.1 Core Tables

**accounts**
- Primary user table
- Fields: id, email, password_hash, name, account_type, has_verified_results

**verification_connections**
- OAuth connections to GA4, HubSpot, Stripe
- Fields: id, account_id, provider, access_token (encrypted), refresh_token

**verification_data**
- Verified metrics from third-party APIs
- Fields: id, account_id, source, metric_type, metric_value, is_verified

**projects**
- Main project/order table
- Fields: id, buyer_id, creator_id, service_id, total_amount, status, milestones (JSONB)

**project_milestones**
- Individual milestones within projects
- Fields: id, project_id, milestone_number, payment_amount, status, verification_data_id

**escrow_transactions**
- Stripe Connect escrow transactions
- Fields: id, project_id, buyer_id, creator_id, amount, status, stripe_payment_intent_id

**Full schema:** See `DATABASE_SCHEMA.md`

---

## 6. Third-Party Integrations

### 6.1 Google Analytics 4 API

**Purpose:** Verify traffic/conversion metrics

**OAuth Scopes:**
- `https://www.googleapis.com/auth/analytics.readonly`

**API Endpoints Used:**
- `analyticsdata.properties.runReport` - Get metrics data

**Implementation:**
```typescript
// Example: Fetch verified metrics
const fetchGA4Metrics = async (propertyId: string, accessToken: string) => {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }]
      })
    }
  );
  return response.json();
};
```

**Rate Limits:** 10,000 requests/day per project

---

### 6.2 Stripe Connect

**Purpose:** Escrow payments, creator payouts

**Account Type:** Express Connect

**Webhooks to Handle:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `transfer.created`
- `transfer.failed`

**Implementation Flow:**
1. Creator completes Stripe onboarding → Store `stripe_account_id`
2. Buyer initiates project → Create `PaymentIntent` with `on_behalf_of` creator
3. Funds held → Update `escrow_transactions` status to 'held'
4. Milestone approved → Create `Transfer` to creator's Connect account
5. Webhook confirms → Update status to 'released'

**Test Mode:** Use Stripe test API keys for development

---

### 6.3 HubSpot API (Phase 2)

**Purpose:** Verify leads/contacts/revenue metrics

**OAuth Scopes:**
- `contacts`
- `analytics`

**API Endpoints:**
- `/crm/v3/objects/contacts` - Get contact count
- `/analytics/v2/reports` - Get conversion data

---

## 7. Security Requirements

### 7.1 Data Encryption

**At Rest:**
- Database: AES-256 encryption (AWS RDS native)
- OAuth tokens: Encrypted before storing (use `crypto` module)

**In Transit:**
- HTTPS/TLS 1.3 everywhere
- Certificate: Let's Encrypt or AWS Certificate Manager

### 7.2 Password Security

**Hashing:** bcrypt with 12 rounds
```typescript
import bcrypt from 'bcrypt';

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};
```

**Validation:**
- Minimum 8 characters
- Must include: uppercase, lowercase, number
- Check against common passwords list (zxcvbn)

### 7.3 Rate Limiting

**API Rate Limits:**
- Auth endpoints: 5 requests/15 min per IP
- General endpoints: 100 requests/min per user
- Verification endpoints: 10 requests/min per user

**Implementation:** `express-rate-limit` middleware

### 7.4 Input Validation

**All inputs validated using Zod:**
```typescript
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  account_type: z.enum(['creator', 'buyer'])
});
```

---

## 8. Performance & Scalability

### 8.1 Database Optimization

**Indexes:**
- All foreign keys indexed
- `accounts.email` - unique index
- `projects.status` - index for filtering
- `verification_data.is_verified` - partial index

**Query Optimization:**
- Use prepared statements (parameterized queries)
- Limit SELECT fields (avoid `SELECT *`)
- Pagination for all list endpoints

### 8.2 Caching Strategy

**Redis Cache (optional for MVP):**
- Creator profiles: TTL 5 minutes
- Service listings: TTL 10 minutes
- Verification status: TTL 1 hour

**Cache Invalidation:**
- On profile update
- On new verification data
- On service update

### 8.3 API Response Times

**Target SLAs:**
- Auth endpoints: <500ms
- GET endpoints: <200ms
- POST/PATCH endpoints: <1s
- Verification sync: <5s (async job)

### 8.4 Scalability Plan

**Horizontal Scaling:**
- Stateless backend (JWT, no sessions) → Multiple instances
- Database connection pooling (max 20 connections/instance)
- Load balancer: AWS ALB or CloudFlare

**Database:**
- Read replicas for analytics queries (Phase 2)
- Partitioning for `verification_data`, `escrow_events_log` by date

---

## 9. Error Handling

### 9.1 Error Response Format

**Standard Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email",
    "details": { ... }
  }
}
```

**HTTP Status Codes:**
- `400` - Bad Request (validation)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### 9.2 Logging

**Log Levels:**
- `ERROR` - Errors requiring immediate attention
- `WARN` - Potential issues
- `INFO` - Important events (project created, escrow released)
- `DEBUG` - Detailed debugging (dev only)

**Log Format (JSON):**
```json
{
  "timestamp": "2026-02-28T10:00:00Z",
  "level": "INFO",
  "service": "api",
  "endpoint": "/api/v1/projects",
  "userId": 123,
  "message": "Project created",
  "metadata": { "projectId": 789 }
}
```

---

## 10. Testing Requirements

### 10.1 Unit Tests

**Coverage Target:** 80%

**Tools:**
- Jest (test runner)
- Supertest (API testing)

**Example:**
```typescript
describe('POST /api/v1/auth/signup', () => {
  it('should create a new user account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        account_type: 'creator'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});
```

### 10.2 Integration Tests

**Scenarios:**
- Full project flow (create → pay → milestone → release escrow)
- Verification flow (connect GA4 → sync data → verify metric)
- Escrow release (auto-release after X days)

### 10.3 Load Testing

**Tools:** k6, Artillery

**Scenarios:**
- 100 concurrent users browsing services
- 50 concurrent project creations
- Verification sync under load

---

## 11. Deployment

### 11.1 Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (256-bit)
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `SENDGRID_API_KEY` - Email service

**Optional:**
- `REDIS_URL` - Redis cache connection
- `SENTRY_DSN` - Error tracking
- `MIXPANEL_TOKEN` - Product analytics

### 11.2 CI/CD Pipeline

**GitHub Actions:**
1. Run tests on PR
2. Build Docker image
3. Deploy to staging (on merge to `develop`)
4. Deploy to production (on merge to `main`)

**Deployment Checklist:**
- [ ] Run database migrations
- [ ] Update environment variables
- [ ] Run smoke tests
- [ ] Monitor error rates (Sentry)

---

## 12. Next Steps for Developers

### Priority 1 (Sprint 1 - Weeks 1-2):
1. Set up development environment (see `DEVELOPER_SETUP.md`)
2. Implement auth system (signup, login, JWT)
3. Create account types (creator/buyer)
4. Basic profile CRUD

### Priority 2 (Sprint 2 - Weeks 3-4):
1. Google Analytics 4 OAuth integration
2. Verification badge logic
3. Service listings CRUD
4. Service discovery/search

### Priority 3 (Sprint 3 - Weeks 5-6):
1. Stripe Connect onboarding
2. Escrow payment flow
3. Project creation
4. Milestone tracking

**Full sprint plan:** See `SPRINT_1_PLAN.md`

---

**Document Version:** 1.0
**Last Updated:** February 28, 2026
**Maintained By:** Engineering Team
