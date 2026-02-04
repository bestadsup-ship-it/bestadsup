# Setup Guide

Step-by-step instructions to get the B2B Ad Platform running.

## Prerequisites

Ensure you have the following installed:

- **Node.js** 18.x or higher - [Download](https://nodejs.org/)
- **PostgreSQL** 15.x or higher - [Download](https://www.postgresql.org/download/)
- **Redis** 7.x or higher - [Download](https://redis.io/download)
- **Docker** (optional) - [Download](https://www.docker.com/products/docker-desktop)

## Setup Steps

### 1. Install Dependencies

```bash
cd C:\Users\percy\B2BAdSite
npm install
```

This will install all dependencies for all workspaces (monorepo setup).

### 2. Setup Environment Variables

```bash
# Copy the example environment file
copy .env.example .env
```

Edit `.env` and update if needed:
```
DATABASE_URL=postgresql://adplatform:devpassword@localhost:5432/adplatform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### 3. Setup Database

#### Option A: Using Docker

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready (check with docker-compose ps)

# Initialize database schema
docker-compose exec postgres psql -U adplatform -d adplatform < database/schema.sql

# Load seed data (test account and sample campaigns)
docker-compose exec postgres psql -U adplatform -d adplatform < database/seed.sql
```

#### Option B: Local PostgreSQL

```bash
# Create database
createdb -U postgres adplatform

# Create user
psql -U postgres -c "CREATE USER adplatform WITH PASSWORD 'devpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE adplatform TO adplatform;"

# Initialize schema
psql -U adplatform -d adplatform -f database/schema.sql

# Load seed data
psql -U adplatform -d adplatform -f database/seed.sql
```

### 4. Build Shared Package

```bash
npm run build --workspace=packages/shared
```

### 5. Start Services

#### Option A: All Services at Once

```bash
npm run dev
```

This starts all services in parallel:
- Ad Server (3001)
- Control Plane (3002)
- Analytics Ingest (3003)
- Reporting API (3004)
- Dashboard (3005)

#### Option B: Individual Services

Open separate terminal windows for each:

```bash
# Terminal 1 - Ad Server
npm run dev --workspace=services/ad-server

# Terminal 2 - Control Plane
npm run dev --workspace=services/control-plane

# Terminal 3 - Analytics Ingest
npm run dev --workspace=services/analytics-ingest

# Terminal 4 - Reporting API
npm run dev --workspace=services/reporting-api

# Terminal 5 - Dashboard
npm run dev --workspace=packages/dashboard
```

### 6. Verify Installation

Open your browser and check:

1. **Marketing Site**: http://localhost:3000
2. **Dashboard**: http://localhost:3005
3. **Ad Server Health**: http://localhost:3001/health

All should return successful responses.

### 7. Login to Dashboard

Use the seeded test account:
- **Email**: test@example.com
- **Password**: password123

Or create a new account via the signup page.

### 8. Test Ad Serving

Open `packages/ad-tag/example.html` in your browser to see ads being served.

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused` or `database does not exist`

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -U postgres -l | grep adplatform

# Verify credentials
psql -U adplatform -d adplatform -c "SELECT 1"
```

### Redis Connection Issues

**Error**: `Redis connection failed`

**Solution**:
```bash
# Check Redis is running
redis-cli ping
# Should return PONG

# If using Docker
docker-compose ps redis
```

### Port Already in Use

**Error**: `Port 3001 is already in use`

**Solution**:
```bash
# Windows - Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in .env file
AD_SERVER_PORT=3011
```

### Build Errors

**Error**: `Cannot find module '@b2b-ad-platform/shared'`

**Solution**:
```bash
# Rebuild shared package
npm run build --workspace=packages/shared

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors in Dashboard

**Error**: `Access-Control-Allow-Origin` errors

**Solution**:
Edit `.env` and add dashboard URL:
```
ALLOWED_ORIGINS=http://localhost:3005,http://localhost:3000
```

Restart the services.

## Development Tips

### Hot Reload

All services use `tsx watch` or webpack dev server for hot reload during development.

### Viewing Logs

```bash
# Docker Compose
docker-compose logs -f ad-server
docker-compose logs -f control-plane

# Local
# Logs appear in terminal where service is running
```

### Database GUI Tools

Use tools like:
- pgAdmin
- DBeaver
- TablePlus

Connection details from `.env` file.

### Redis GUI Tools

Use tools like:
- RedisInsight
- Medis
- Redis Commander

## Next Steps

1. Create your own property and ad units
2. Upload campaigns and creatives
3. Integrate the JavaScript tag into your website
4. Monitor metrics in the dashboard

## Production Deployment

See the main README.md for Docker deployment instructions.

Key changes for production:
1. Change `JWT_SECRET` to a strong random value
2. Use managed PostgreSQL and Redis
3. Set `NODE_ENV=production`
4. Update `ALLOWED_ORIGINS` to your domains
5. Enable HTTPS
6. Configure monitoring and logging
7. Set up backups for PostgreSQL

## Support

If you encounter issues:
1. Check service health endpoints
2. Review logs for errors
3. Verify environment variables
4. Ensure database migrations ran successfully
