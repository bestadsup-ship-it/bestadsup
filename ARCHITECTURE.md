# System Architecture

## Overview

The B2B Ad Platform is a microservices-based ad serving system designed for low latency, high reliability, and clear system boundaries.

## Architecture Principles

1. **Fail Closed**: Never return 5xx to clients; return empty response instead
2. **No Blocking**: Analytics must be asynchronous and never block ad serving
3. **Data Isolation**: All data partitioned by account_id
4. **No Joins in Hot Path**: Ad serving uses single queries with cached data
5. **Independent Deployment**: Each service deploys independently

## System Components

### 1. Marketing Site (Port 3000)
**Technology**: Static HTML + Nginx
**Purpose**: Public-facing landing page
**Deployment**: Nginx container

**Responsibilities**:
- Display product information
- Link to dashboard
- Serve static content

**Non-Goals**:
- No dynamic content
- No API calls
- No user data

---

### 2. Control Plane API (Port 3002)
**Technology**: Node.js + Express + PostgreSQL
**Purpose**: Account and campaign management

**Responsibilities**:
- User authentication (JWT)
- Account management
- Property CRUD
- Ad unit CRUD
- Campaign CRUD
- Creative management
- Ad unit ↔ Campaign mapping

**API Endpoints**:
```
POST   /auth/signup
POST   /auth/login
GET    /accounts/me
GET    /properties
POST   /properties
GET    /ad-units
POST   /ad-units
GET    /campaigns
POST   /campaigns
PATCH  /campaigns/:id
GET    /creatives
POST   /creatives
POST   /creatives/ad-unit-campaigns
```

**Data Model**:
- Accounts
- Properties (1:many with Account)
- Ad Units (1:many with Property)
- Campaigns (1:many with Account)
- Creatives (1:many with Campaign)
- Ad Unit Campaigns (many:many mapping)

**Performance**:
- Connection pool: 20 connections
- JWT auth on all protected routes
- Account-scoped queries (security)

---

### 3. Ad Server (Port 3001)
**Technology**: Node.js + Express + PostgreSQL + Redis
**Purpose**: Real-time ad decision and response

**Critical Path** (Must be <300ms):
```
Client Request
    ↓
Rate Limiter (Redis)
    ↓
Validate Request (Zod)
    ↓
Check Redis Cache (ad_unit → campaigns)
    ↓ (cache miss)
Query Database (single SELECT with JOINs)
    ↓
Select Creative (priority-based)
    ↓
Generate Tracking Pixel URL
    ↓
Return Response
    ↓ (async, fire-and-forget)
Log Request to Database
```

**Request Flow**:
```javascript
POST /ad/request
{
  "ad_unit_id": "uuid",
  "page_url": "https://...",
  "user_agent": "Mozilla/..."
}

// Response (always 200)
{
  "creative_url": "https://..." | null,
  "tracking_pixels": ["https://..."]
}
```

**Ad Selection Algorithm**:
1. Find active campaigns for ad_unit_id
2. Filter by date range (start_date ≤ now ≤ end_date)
3. Match creative dimensions to ad unit
4. Sort by priority (DESC)
5. Select first match
6. Return no-fill if none found

**Caching Strategy**:
- Cache key: `ad_unit:{ad_unit_id}`
- TTL: 300 seconds (5 minutes)
- Cache invalidation on campaign updates (via Control Plane)

**Error Handling**:
- Database error → Return no-fill
- Invalid ad_unit_id → Return no-fill
- Rate limit exceeded → Return no-fill
- Never return 5xx to client

**Metrics Exposed**:
- `http_request_duration_ms` (histogram)
- `ad_requests_total` (counter)
- `ad_no_fill_total` (counter by reason)
- `cache_hits_total` / `cache_misses_total`
- `db_query_duration_ms` (histogram)

---

### 4. Analytics Ingest (Port 3003)
**Technology**: Node.js + Express + PostgreSQL + Redis
**Purpose**: Capture impression and click events

**Event Flow**:
```
Tracking Pixel Request
    ↓
Parse Query Params (no body parsing)
    ↓
Add to Event Buffer (in-memory)
    ↓
Return 204 No Content (<50ms)
    ↓ (background, every 5s or 100 events)
Batch Flush to Database
    ↓
Insert into events table
    ↓
UPSERT into metrics_hourly table
```

**API Endpoints**:
```
POST /event/impression?ad_unit_id=...&campaign_id=...&creative_id=...&page_url=...&timestamp=...
POST /event/click?ad_unit_id=...&campaign_id=...&creative_id=...&page_url=...&timestamp=...
```

**Buffering System**:
- In-memory array buffer
- Flush triggers:
  - Time: Every 5 seconds
  - Size: After 100 events
  - Shutdown: On SIGTERM/SIGINT
- Batch INSERT for efficiency

**Data Storage**:
1. **events table**: Raw event data
   - Full event details
   - Used for detailed analytics
   - Partitionable by timestamp

2. **metrics_hourly table**: Aggregated data
   - Pre-computed hourly metrics
   - Fast dashboard queries
   - UPSERT for atomic increments

**Performance**:
- Response time: <50ms P95
- Throughput: Thousands of events/second
- Database writes: Batched (reduces load)

---

### 5. Reporting API (Port 3004)
**Technology**: Node.js + Express + PostgreSQL + Redis
**Purpose**: Aggregated metrics for dashboard

**Query Flow**:
```
Dashboard Request
    ↓
Authenticate (JWT)
    ↓
Check Redis Cache
    ↓ (cache miss)
Query metrics_hourly table (fast)
    ↓
Query ad_requests table (fill rate)
    ↓
Calculate derived metrics
    ↓
Cache result (5 min TTL)
    ↓
Return to client
```

**API Endpoints**:
```
GET /metrics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&ad_unit_id=uuid&campaign_id=uuid
```

**Response**:
```json
{
  "impressions": 150000,
  "clicks": 1500,
  "revenue": 75000,  // in cents
  "fill_rate": 95.5  // percentage
}
```

**Calculated Metrics**:
- **Revenue**: `(impressions / 1000) * CPM`
- **Fill Rate**: `(filled_requests / total_requests) * 100`
- **CTR**: `(clicks / impressions) * 100`
- **eCPM**: `(revenue / impressions) * 1000`

**Caching**:
- Cache key: `metrics:{account_id}:{start_date}:{end_date}:{ad_unit_id}:{campaign_id}`
- TTL: 300 seconds
- Acceptable staleness: ≤5 minutes

---

### 6. Dashboard (Port 3005)
**Technology**: React + Webpack + Nginx
**Purpose**: Publisher dashboard UI

**Features**:
- Authentication (login/signup)
- Metrics visualization (Recharts)
- Date range selection
- Ad unit performance table
- Campaign management (via Control Plane)

**Data Flow**:
```
User Login
    ↓
POST /auth/login (Control Plane)
    ↓
Store JWT in localStorage
    ↓
GET /metrics (Reporting API) with JWT
    ↓
Display charts and tables
```

---

### 7. JavaScript Ad Tag
**Technology**: Vanilla JavaScript
**Purpose**: Client-side ad loading

**Size**: ~1KB gzipped (<10KB requirement)

**Lifecycle**:
```
Page Load
    ↓
DOM Ready
    ↓
Find all .b2b-ad-unit elements
    ↓
For each ad unit:
    ↓
POST /ad/request to Ad Server (with timeout)
    ↓
Render creative (if received)
    ↓
Fire tracking pixels (on image load)
```

**Features**:
- Non-blocking async loading
- Configurable timeout (default 500ms)
- Auto-initialization on DOM ready
- Manual re-initialization support
- Graceful no-fill handling

---

## Data Flow Diagrams

### Ad Serving Flow
```
Publisher Page
    ↓ (1)
JavaScript Tag loads
    ↓ (2)
POST /ad/request to Ad Server
    ↓ (3)
Ad Server queries DB/cache
    ↓ (4)
Ad Server returns creative URL + tracking pixel
    ↓ (5)
Tag renders image
    ↓ (6)
Image onload fires tracking pixel
    ↓ (7)
Analytics Ingest receives impression event
    ↓ (8)
Event buffered and batch written to DB
```

### Metrics Flow
```
Events Table (raw data)
    ↓
Aggregated to metrics_hourly (on write)
    ↓
Reporting API queries metrics_hourly
    ↓
Cached in Redis (5 min)
    ↓
Dashboard displays to user
```

---

## Database Schema

### Core Tables
- **accounts**: User accounts
- **properties**: Publisher websites
- **ad_units**: Ad placements on properties
- **campaigns**: Advertising campaigns
- **creatives**: Ad creatives (images, sizes)
- **ad_unit_campaigns**: Mapping (which campaigns serve on which ad units)

### Analytics Tables
- **events**: Raw impression/click events
- **ad_requests**: Request log for fill rate
- **metrics_hourly**: Pre-aggregated hourly metrics

### Indexes
- All foreign keys indexed
- `ad_units(id, account_id)` composite index
- `events(timestamp DESC)` for time-range queries
- `metrics_hourly(account_id, hour_timestamp DESC)`

---

## Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | Node.js + Express | Fast, async I/O, good ecosystem |
| Database | PostgreSQL 15 | ACID, JSON support, excellent indexing |
| Cache | Redis 7 | Fast in-memory cache, pub/sub |
| Frontend | React 18 | Component-based, large ecosystem |
| Charts | Recharts | React-native, composable |
| Validation | Zod | Type-safe runtime validation |
| Auth | JWT | Stateless, scalable |
| Metrics | Prometheus (prom-client) | Industry standard |
| Container | Docker | Portability, isolation |

---

## Performance Optimizations

### Ad Server
1. **Single query** for ad selection (no N+1)
2. **Redis caching** of eligible campaigns
3. **Connection pooling** (20-30 connections)
4. **Async logging** (fire-and-forget)
5. **Pre-computed tracking pixels**

### Analytics Ingest
1. **No body parsing** (query params only)
2. **In-memory buffering** (batch writes)
3. **Dual storage** (raw + aggregated)
4. **No response body** (204 No Content)

### Reporting API
1. **Pre-aggregated data** (metrics_hourly)
2. **Redis caching** (5 min TTL)
3. **Limited date ranges** (prevent full table scans)
4. **Account-scoped queries** (partition pruning)

### Dashboard
1. **Webpack code splitting**
2. **Production builds** minified + gzipped
3. **Nginx caching** of static assets
4. **Lazy loading** of routes

---

## Security Measures

1. **JWT Authentication**: Stateless, signed tokens
2. **Account Scoping**: All queries filtered by account_id
3. **Rate Limiting**: Redis-based request throttling
4. **Helmet.js**: Security headers (XSS, CSP)
5. **CORS**: Whitelisted origins only
6. **No PII**: User agent optional, no cookies
7. **SQL Parameterization**: Prevents SQL injection
8. **Input Validation**: Zod schemas for all inputs

---

## Monitoring & Observability

### Health Checks
- `/health` endpoint on all services
- Database connectivity
- Redis connectivity

### Metrics (Prometheus)
- Request latency histograms
- Error counters by reason
- Cache hit/miss ratios
- Database query duration

### Logging
- Structured console logs
- Request/response logging
- Error stack traces
- Performance timing logs

---

## Deployment Architecture

```
┌─────────────────┐
│   Load Balancer │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌─────┐   ┌─────┐  ┌─────┐  ┌─────┐
│ Ad  │   │Ctrl │  │Anlyt│  │Rpt  │
│Srvr │   │Plane│  │Ingst│  │ API │
└──┬──┘   └──┬──┘  └──┬──┘  └──┬──┘
   └─────┬───┴────────┴────────┘
         ▼
  ┌──────────────┐
  │  PostgreSQL  │
  │   (Primary)  │
  └──────────────┘
```

Each service:
- Runs in Docker container
- Horizontally scalable
- Independent deployment
- Stateless (except databases)

---

## Future Enhancements (Post-MVP)

1. **Read replicas** for reporting queries
2. **Event streaming** (Kafka) for analytics
3. **Multi-region deployment**
4. **A/B testing** framework
5. **Advanced targeting** (geo, device, etc.)
6. **Fraud detection** (click fraud, impression fraud)
7. **Viewability tracking** (Intersection Observer)
8. **Real-time dashboards** (WebSockets)

---

This architecture satisfies all MVP requirements while maintaining clear boundaries and excellent performance characteristics.
