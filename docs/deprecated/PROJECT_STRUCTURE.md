# Project Structure

Complete file tree of the B2B Ad Platform MVP.

```
B2BAdSite/
│
├── 📄 README.md                      # Main documentation
├── 📄 SETUP.md                       # Setup instructions
├── 📄 ARCHITECTURE.md                # System architecture
├── 📄 API.md                         # API documentation
├── 📄 VERIFICATION.md                # Testing checklist
├── 📄 PROJECT_STRUCTURE.md           # This file
│
├── 📦 package.json                   # Monorepo root package
├── 🔧 .env.example                   # Environment variables template
├── 🔧 .gitignore                     # Git ignore rules
├── 🐳 docker-compose.yml             # Docker orchestration
│
├── 📂 database/
│   ├── schema.sql                    # PostgreSQL schema
│   └── seed.sql                      # Test data
│
├── 📂 scripts/
│   ├── init-db.sh                    # Database init (Unix)
│   └── init-db.bat                   # Database init (Windows)
│
├── 📂 services/
│   │
│   ├── 📂 ad-server/                 # Real-time ad serving
│   │   ├── 📦 package.json
│   │   ├── 🔧 tsconfig.json
│   │   ├── 🐳 Dockerfile
│   │   └── 📂 src/
│   │       ├── index.ts              # Server entry point
│   │       ├── db.ts                 # Database connection
│   │       ├── cache.ts              # Redis caching
│   │       ├── metrics.ts            # Prometheus metrics
│   │       ├── 📂 middleware/
│   │       │   ├── error-handler.ts
│   │       │   └── rate-limiter.ts
│   │       ├── 📂 routes/
│   │       │   ├── ad.ts             # Ad request endpoint
│   │       │   └── health.ts         # Health check
│   │       └── 📂 services/
│   │           ├── ad-selector.ts    # Ad selection logic
│   │           └── ad-logger.ts      # Request logging
│   │
│   ├── 📂 analytics-ingest/          # Event tracking
│   │   ├── 📦 package.json
│   │   ├── 🔧 tsconfig.json
│   │   ├── 🐳 Dockerfile
│   │   ├── 📄 README.md
│   │   ├── 🔧 .env.example
│   │   └── 📂 src/
│   │       ├── index.ts
│   │       ├── db.ts
│   │       ├── event-buffer.ts       # Buffered writes
│   │       └── 📂 routes/
│   │           ├── event.ts          # Event endpoints
│   │           └── health.ts
│   │
│   ├── 📂 control-plane/             # Account & campaign management
│   │   ├── 📦 package.json
│   │   ├── 🔧 tsconfig.json
│   │   ├── 🐳 Dockerfile
│   │   └── 📂 src/
│   │       ├── index.ts
│   │       ├── 📂 middleware/
│   │       │   └── auth.ts           # JWT authentication
│   │       └── 📂 routes/
│   │           ├── auth.ts           # Signup/login
│   │           ├── accounts.ts
│   │           ├── properties.ts
│   │           ├── ad-units.ts
│   │           ├── campaigns.ts
│   │           └── creatives.ts
│   │
│   ├── 📂 reporting-api/             # Metrics & analytics
│   │   ├── 📦 package.json
│   │   ├── 🔧 tsconfig.json
│   │   ├── 🐳 Dockerfile
│   │   ├── 📄 README.md
│   │   ├── 🔧 .env.example
│   │   └── 📂 src/
│   │       ├── index.ts
│   │       ├── db.ts
│   │       ├── cache.ts
│   │       ├── 📂 middleware/
│   │       │   └── auth.ts
│   │       └── 📂 routes/
│   │           ├── metrics.ts        # Metrics endpoint
│   │           └── health.ts
│   │
│   └── 📂 marketing-site/            # Public landing page
│       ├── 🐳 Dockerfile
│       └── index.html                # Static HTML
│
├── 📂 packages/
│   │
│   ├── 📂 shared/                    # Shared utilities
│   │   ├── 📦 package.json
│   │   ├── 🔧 tsconfig.json
│   │   └── 📂 src/
│   │       ├── index.ts              # Exports
│   │       ├── types.ts              # TypeScript types
│   │       └── utils.ts              # Utility functions
│   │
│   ├── 📂 ad-tag/                    # JavaScript ad tag
│   │   ├── 📄 README.md
│   │   ├── ad-tag.js                 # Vanilla JS tag
│   │   └── example.html              # Demo page
│   │
│   └── 📂 dashboard/                 # React dashboard
│       ├── 📦 package.json
│       ├── 🔧 webpack.config.js
│       ├── 🐳 Dockerfile
│       ├── 🔧 nginx.conf
│       ├── 📄 README.md
│       ├── 🔧 .env.example
│       ├── 🔧 .gitignore
│       ├── 🔧 .dockerignore
│       ├── 📂 public/
│       │   └── index.html
│       └── 📂 src/
│           ├── index.js              # React entry point
│           ├── App.js                # Main app component
│           ├── 📂 api/
│           │   └── client.js         # API client
│           ├── 📂 pages/
│           │   ├── Login.js
│           │   ├── Signup.js
│           │   └── Dashboard.js
│           ├── 📂 components/
│           │   ├── MetricCard.js
│           │   ├── MetricsChart.js
│           │   ├── AdUnitsList.js
│           │   └── DateRangePicker.js
│           └── 📂 styles/
│               ├── global.css
│               ├── auth.css
│               ├── dashboard.css
│               └── components.css
│
└── 📂 node_modules/                  # Dependencies (gitignored)
```

## File Count by Type

| Type | Count |
|------|-------|
| TypeScript | ~35 files |
| JavaScript | ~15 files |
| SQL | 2 files |
| HTML | 3 files |
| CSS | 4 files |
| JSON | ~15 files |
| Dockerfile | 6 files |
| Markdown | 7 files |
| Config | ~10 files |

## Lines of Code (Estimated)

| Component | LOC |
|-----------|-----|
| Ad Server | ~800 |
| Control Plane | ~600 |
| Analytics Ingest | ~500 |
| Reporting API | ~400 |
| Dashboard (React) | ~1200 |
| Shared Package | ~300 |
| Ad Tag | ~200 |
| Database Schema | ~250 |
| **Total** | **~4,250** |

## Key Directories

### `/services`
Independent microservices that can be deployed separately:
- Each has its own `package.json`
- Each has its own `Dockerfile`
- Each exposes health check endpoint
- Each uses shared package for common types

### `/packages`
Shared code used across services:
- **shared**: Common TypeScript types and utilities
- **ad-tag**: Client-side JavaScript
- **dashboard**: React UI for publishers

### `/database`
PostgreSQL schema and seed data:
- **schema.sql**: Full database schema with indexes
- **seed.sql**: Test account and sample campaigns

### `/scripts`
Helper scripts for development:
- **init-db.sh**: Database initialization (Unix)
- **init-db.bat**: Database initialization (Windows)

## Dependencies

### Backend Services
- express
- pg (PostgreSQL)
- redis
- zod (validation)
- bcrypt (passwords)
- jsonwebtoken (JWT)
- helmet (security)
- cors
- prom-client (metrics)

### Frontend (Dashboard)
- react
- react-dom
- react-router-dom
- recharts (charts)
- axios (HTTP client)
- webpack
- babel

### Development
- typescript
- tsx (TypeScript runner)
- concurrently
- jest (testing)

## Build Artifacts (Gitignored)

```
node_modules/
dist/
build/
*.tsbuildinfo
```

## Configuration Files

- `.env` - Environment variables (gitignored)
- `.env.example` - Environment template
- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Webpack bundler config
- `docker-compose.yml` - Multi-container orchestration
- `nginx.conf` - Nginx web server config

## Documentation Files

1. **README.md** - Main project documentation
2. **SETUP.md** - Installation and setup guide
3. **ARCHITECTURE.md** - System design and architecture
4. **API.md** - Complete API reference
5. **VERIFICATION.md** - Testing checklist
6. **PROJECT_STRUCTURE.md** - This file

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Initialize database
./scripts/init-db.sh  # Unix
# or
scripts\init-db.bat   # Windows

# 4. Build shared package
npm run build --workspace=packages/shared

# 5. Start all services
npm run dev
```

## Production Build

```bash
# Build all services
npm run build

# Build Docker images
docker-compose build

# Start with Docker
docker-compose up -d
```

---

This structure follows microservices architecture with clear separation of concerns and independent deployability.
