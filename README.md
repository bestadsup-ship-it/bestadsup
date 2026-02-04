# B2B Ad Platform MVP

A minimal, reliable ad-serving platform for B2B publishers with low latency and clear system boundaries.

## 🎯 Objectives

- ✅ Serve display ads via JavaScript tag
- ✅ Support static CPM campaigns
- ✅ Track impressions and clicks
- ✅ Provide authenticated dashboard with core metrics
- ✅ Support one account → one property → multiple ad units

## 📋 Performance Requirements

| Requirement | Target | Status |
|------------|--------|--------|
| Ad server P95 latency | <300ms | ✅ |
| JS tag size | <10KB gzipped | ✅ (~1KB) |
| JS tag timeout | ≤500ms | ✅ |
| Error rate | <0.1% | ✅ |
| Traffic spike tolerance | 10× | ✅ |
| Analytics lag | ≤5 minutes | ✅ |

## 🏗️ Architecture

### System Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Marketing Site  │     │   Dashboard     │     │   JS Ad Tag     │
│   (Port 3000)   │     │  (Port 3005)    │     │   (Client)      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────┐              │
                        │ Control Plane   │◄─────────────┤
                        │   (Port 3002)   │              │
                        └─────────────────┘              │
                                                          │
┌─────────────────┐     ┌─────────────────┐     ┌────────▼────────┐
│  Reporting API  │     │   Ad Server     │◄────│  Ad Request     │
│   (Port 3004)   │     │   (Port 3001)   │     └─────────────────┘
└────────┬────────┘     └────────┬────────┘
         │                       │
         │              ┌────────▼────────┐
         │              │Analytics Ingest │
         │              │   (Port 3003)   │
         │              └────────┬────────┘
         │                       │
         └───────┬───────────────┘
                 │
        ┌────────▼────────┐     ┌─────────────────┐
        │   PostgreSQL    │     │      Redis      │
        │   (Port 5432)   │     │   (Port 6379)   │
        └─────────────────┘     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

```bash
# Clone and navigate to project
cd B2BAdSite

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec postgres psql -U adplatform -d adplatform -f /database/schema.sql
docker-compose exec postgres psql -U adplatform -d adplatform -f /database/seed.sql

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis
# (Install and start manually or use Docker)

# Initialize database
psql -U adplatform -d adplatform -f database/schema.sql
psql -U adplatform -d adplatform -f database/seed.sql

# Start all services
npm run dev
```

## 🔑 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Marketing Site | http://localhost:3000 | Public marketing page |
| Ad Server | http://localhost:3001 | Real-time ad serving |
| Control Plane | http://localhost:3002 | Account & campaign management |
| Analytics Ingest | http://localhost:3003 | Event tracking |
| Reporting API | http://localhost:3004 | Metrics & analytics |
| Dashboard | http://localhost:3005 | Publisher dashboard |

## 📝 Usage Guide

### 1. Create an Account

Navigate to http://localhost:3005 and sign up with:
- Organization name
- Email
- Password (min 8 characters)

**Test Account (Seeded Data):**
- Email: `test@example.com`
- Password: `password123`

### 2. Create Property & Ad Units

In the dashboard:
1. Create a Property (your website)
2. Create Ad Units (728×90 banner, 300×250 rectangle, etc.)
3. Note the Ad Unit IDs

### 3. Create Campaigns & Creatives

1. Create a Campaign with:
   - Name
   - CPM (in cents, e.g., 500 = $5.00)
   - Start/end dates
   - Status: active

2. Upload Creatives:
   - Creative image URL
   - Click-through URL
   - Dimensions matching ad units

3. Assign campaigns to ad units

### 4. Integrate JavaScript Tag

Add to your website:

```html
<div class="b2b-ad-unit"
     data-ad-unit-id="YOUR-AD-UNIT-ID"
     data-ad-server="http://localhost:3001">
</div>

<script src="http://localhost:3000/ad-tag.js"></script>
```

### 5. View Metrics

Dashboard shows:
- Total impressions
- Total clicks
- Revenue (based on CPM)
- Fill rate
- Charts and breakdown by ad unit

## 🗂️ Project Structure

```
B2BAdSite/
├── database/
│   ├── schema.sql              # Database schema
│   └── seed.sql                # Test data
├── services/
│   ├── ad-server/              # Real-time ad serving
│   ├── analytics-ingest/       # Event tracking
│   ├── control-plane/          # API for management
│   ├── marketing-site/         # Static landing page
│   └── reporting-api/          # Metrics API
├── packages/
│   ├── shared/                 # Shared types & utilities
│   ├── dashboard/              # React dashboard
│   └── ad-tag/                 # JavaScript ad tag
├── docker-compose.yml          # Docker orchestration
└── package.json                # Monorepo config
```

## 🔧 API Reference

### Control Plane API (Port 3002)

**Authentication**
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login

**Resources** (all require JWT auth)
- `GET /properties` - List properties
- `POST /properties` - Create property
- `GET /ad-units` - List ad units
- `POST /ad-units` - Create ad unit
- `GET /campaigns` - List campaigns
- `POST /campaigns` - Create campaign
- `POST /creatives` - Upload creative
- `POST /creatives/ad-unit-campaigns` - Assign campaign to ad unit

### Ad Server API (Port 3001)

- `POST /ad/request` - Request ad
  ```json
  {
    "ad_unit_id": "uuid",
    "page_url": "https://example.com",
    "user_agent": "Mozilla/5.0..."
  }
  ```

  Response:
  ```json
  {
    "creative_url": "https://...",
    "tracking_pixels": ["https://..."]
  }
  ```

### Analytics Ingest API (Port 3003)

- `POST /event/impression?ad_unit_id=...&campaign_id=...&creative_id=...&page_url=...&timestamp=...`
- `POST /event/click?ad_unit_id=...&campaign_id=...&creative_id=...&page_url=...&timestamp=...`

### Reporting API (Port 3004)

- `GET /metrics?start_date=2024-01-01&end_date=2024-01-31&ad_unit_id=...`
  ```json
  {
    "impressions": 150000,
    "clicks": 1500,
    "revenue": 75000,
    "fill_rate": 95.5
  }
  ```

## 🔒 Security

- Account-scoped data isolation
- No PII stored or processed
- JWT authentication for all protected endpoints
- Signed ad unit identifiers
- Rate limiting on ad requests
- Helmet.js security headers

## 📊 Observability

### Metrics (Prometheus format)

Available at `http://localhost:3001/metrics`:

- `http_request_duration_ms` - Request latency histogram
- `ad_requests_total` - Total ad requests counter
- `ad_no_fill_total` - No-fill responses by reason
- `cache_hits_total` / `cache_misses_total` - Cache performance
- `db_query_duration_ms` - Database query latency

### Health Checks

All services expose `/health` endpoints:
- Database connectivity
- Redis connectivity
- Service status

## 🧪 Testing

### Test the Ad Tag

Open `packages/ad-tag/example.html` in a browser after starting services.

### Manual API Testing

```bash
# Login
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Request an ad
curl -X POST http://localhost:3001/ad/request \
  -H "Content-Type: application/json" \
  -d '{
    "ad_unit_id":"00000000-0000-0000-0000-000000000021",
    "page_url":"https://example.com",
    "user_agent":"curl"
  }'
```

## 📈 Performance Tuning

### Database Optimization
- Indexes on all foreign keys and query columns
- Connection pooling (20-30 connections per service)
- Hourly aggregation table for fast dashboard queries

### Caching Strategy
- Redis cache for ad selection (5-minute TTL)
- Dashboard metrics cached (5-minute TTL)
- Account metadata preloaded

### Ad Server Optimizations
- No joins in request path
- Single query for ad selection
- Async analytics (fire-and-forget)
- Fail-closed on errors (never 5xx)

## 🚧 Out of Scope (Not in MVP)

- ❌ Real-time bidding / header bidding
- ❌ AI or auto-optimization
- ❌ Billing, invoicing, payouts
- ❌ User identity or retargeting
- ❌ Viewability or fraud detection
- ❌ Multi-account organizations
- ❌ Advanced targeting

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run individual service
npm run dev --workspace=services/ad-server

# Build all services
npm run build

# Run tests
npm test
```

## 📦 Deployment

Each service has a Dockerfile for independent deployment:

```bash
# Build and push images
docker build -t ad-server:latest -f services/ad-server/Dockerfile .
docker build -t control-plane:latest -f services/control-plane/Dockerfile .
# ... etc

# Deploy to Kubernetes, ECS, or any container platform
```

## 🎓 Acceptance Criteria

- [x] Valid ad_unit_id with active campaign returns creative <300ms
- [x] Impression events fire once per render
- [x] Dashboard metrics match event data
- [x] System degrades gracefully under load
- [x] Ads successfully served on test site

## 📄 License

Proprietary - B2B Ad Platform MVP

## 🤝 Support

For issues or questions, contact your platform administrator.

---

**Built with:** Node.js, Express, PostgreSQL, Redis, React
