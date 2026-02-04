# Analytics Ingest Service

High-performance analytics ingestion service for the B2B Ad Platform. Handles impression and click event tracking from tracking pixels with sub-50ms P95 latency.

## Features

- **Fast Response Times**: Fire-and-forget pattern with immediate 204 responses (< 50ms P95)
- **Buffered Writes**: Events are batched and written to database asynchronously
- **Connection Pooling**: Optimized PostgreSQL connection pool for write-heavy workloads
- **Dual Storage**:
  - Raw events stored in `events` table for detailed analytics
  - Aggregated metrics in `metrics_hourly` table for fast dashboard queries
- **Automatic Flushing**: Events are flushed every 5 seconds or after 100 events
- **Graceful Shutdown**: Ensures all buffered events are written before process termination

## Architecture

### Event Flow

1. Tracking pixel makes POST request to `/event/impression` or `/event/click`
2. Event is validated and added to in-memory buffer
3. Immediate 204 response is returned to client
4. Events are batched and written to database asynchronously
5. Metrics are aggregated hourly for dashboard performance

### Buffer System

- **Event Buffer**: Accumulates raw events for batch insertion
- **Metrics Buffer**: Pre-aggregates metrics by hour for efficient upserts
- **Flush Triggers**:
  - Timer-based: Every 5 seconds
  - Size-based: After 100 events
  - Shutdown: On SIGTERM/SIGINT signals

## API Endpoints

### POST /event/impression

Track an ad impression.

**Query Parameters:**
- `ad_unit_id` (required): UUID of the ad unit
- `campaign_id` (required): UUID of the campaign
- `creative_id` (required): UUID of the creative
- `page_url` (required): URL where the ad was displayed
- `timestamp` (optional): Unix timestamp in milliseconds

**Response:**
- `204 No Content` - Event accepted (fire-and-forget)

**Example:**
```bash
curl -X POST "http://localhost:3003/event/impression?ad_unit_id=123&campaign_id=456&creative_id=789&page_url=https://example.com&timestamp=1707048000000"
```

### POST /event/click

Track an ad click.

**Query Parameters:**
- Same as `/event/impression`

**Response:**
- `204 No Content` - Event accepted (fire-and-forget)

**Example:**
```bash
curl -X POST "http://localhost:3003/event/click?ad_unit_id=123&campaign_id=456&creative_id=789&page_url=https://example.com&timestamp=1707048000000"
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "analytics-ingest",
  "timestamp": "2024-02-04T10:00:00.000Z",
  "database": "connected",
  "uptime": 123.45
}
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3003)
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

### Database Configuration

The service uses an optimized connection pool:
- **Max connections**: 30 (higher for write-heavy workload)
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds

### Buffer Configuration

Configured in `src/event-buffer.ts`:
- **Max buffer size**: 100 events
- **Flush interval**: 5000ms (5 seconds)

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run in Production

```bash
npm start
```

## Database Schema

### Events Table

Stores raw event data for detailed analytics:

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL,
    ad_unit_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    creative_id UUID NOT NULL,
    account_id UUID NOT NULL,
    page_url TEXT NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Metrics Hourly Table

Stores pre-aggregated metrics for fast dashboard queries:

```sql
CREATE TABLE metrics_hourly (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL,
    ad_unit_id UUID,
    campaign_id UUID,
    hour_timestamp TIMESTAMP NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    requests INTEGER DEFAULT 0,
    revenue_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, ad_unit_id, campaign_id, hour_timestamp)
);
```

## Performance Considerations

### Write Optimization

1. **Batching**: Multiple events are combined into single INSERT statements
2. **Prepared Statements**: Uses parameterized queries for safety and performance
3. **Connection Pooling**: Reuses database connections to reduce overhead
4. **Account ID Caching**: Campaign → Account mappings are cached in memory

### Response Time Optimization

1. **No Body Parsing**: Skips JSON parsing middleware (uses query params)
2. **Fire-and-Forget**: Immediate response before database writes
3. **Error Handling**: Always returns 204 to avoid blocking tracking pixels
4. **Compression**: Gzip compression for faster responses

### Monitoring

- Console logs for buffer flush operations
- Error logs for failed database operations
- Event counts and timing in flush logs

## Deployment

### Docker

Build and run with Docker:

```bash
docker build -t analytics-ingest .
docker run -p 3003:3003 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  analytics-ingest
```

### Kubernetes

Deploy as a service with multiple replicas for high availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-ingest
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-ingest
  template:
    metadata:
      labels:
        app: analytics-ingest
    spec:
      containers:
      - name: analytics-ingest
        image: analytics-ingest:latest
        ports:
        - containerPort: 3003
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
```

## Troubleshooting

### Events Not Being Recorded

1. Check database connection: `GET /health`
2. Verify event parameters are correct
3. Check console logs for flush errors
4. Ensure database has proper permissions

### High Latency

1. Check database connection pool saturation
2. Verify network latency to database
3. Consider increasing buffer size to reduce flush frequency
4. Check for slow queries in PostgreSQL logs

### Buffer Growing Too Large

1. Increase flush frequency (reduce interval)
2. Reduce buffer size to trigger more frequent flushes
3. Check for database write bottlenecks
4. Consider sharding or partitioning events table

## License

Proprietary - B2B Ad Platform
