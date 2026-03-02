# API Documentation

Complete API reference for the B2B Ad Platform.

## Base URLs

| Service | Base URL | Authentication |
|---------|----------|----------------|
| Control Plane | http://localhost:3002 | JWT (except /auth/*) |
| Ad Server | http://localhost:3001 | None |
| Analytics Ingest | http://localhost:3003 | None |
| Reporting API | http://localhost:3004 | JWT |

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <token>
```

Tokens are obtained via login and expire after 7 days.

---

## Control Plane API

### Authentication

#### POST /auth/signup

Create a new account.

**Request:**
```json
{
  "name": "Publisher Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `201 Created`
```json
{
  "account": {
    "id": "uuid",
    "name": "Publisher Name",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Validation error
- `409` - Email already exists

---

#### POST /auth/login

Login to existing account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "account": {
    "id": "uuid",
    "name": "Publisher Name",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Validation error
- `401` - Invalid credentials

---

### Accounts

#### GET /accounts/me

Get current account details.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Publisher Name",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### Properties

#### GET /properties

List all properties for the authenticated account.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "account_id": "uuid",
    "name": "My Tech Blog",
    "domain": "blog.example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST /properties

Create a new property.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "My Tech Blog",
  "domain": "blog.example.com"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "name": "My Tech Blog",
  "domain": "blog.example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

#### GET /properties/:id

Get a specific property.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "name": "My Tech Blog",
  "domain": "blog.example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `404` - Property not found

---

### Ad Units

#### GET /ad-units

List all ad units for the authenticated account.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "property_id": "uuid",
    "account_id": "uuid",
    "name": "Header Banner",
    "width": 728,
    "height": 90,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST /ad-units

Create a new ad unit.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request:**
```json
{
  "property_id": "uuid",
  "name": "Header Banner",
  "width": 728,
  "height": 90
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "account_id": "uuid",
  "name": "Header Banner",
  "width": 728,
  "height": 90,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

#### GET /ad-units/:id

Get a specific ad unit.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "account_id": "uuid",
  "name": "Header Banner",
  "width": 728,
  "height": 90,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `404` - Ad unit not found

---

### Campaigns

#### GET /campaigns

List all campaigns for the authenticated account.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "account_id": "uuid",
    "name": "Q1 2024 Campaign",
    "cpm": 500,
    "status": "active",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-03-31T23:59:59Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST /campaigns

Create a new campaign.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Q1 2024 Campaign",
  "cpm": 500,
  "status": "active",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31"
}
```

**Field Notes:**
- `cpm`: CPM in cents (e.g., 500 = $5.00 CPM)
- `status`: `"active"`, `"paused"`, or `"completed"`
- `end_date`: Optional, `null` for ongoing campaigns

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "name": "Q1 2024 Campaign",
  "cpm": 500,
  "status": "active",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-03-31T23:59:59Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

#### GET /campaigns/:id

Get a specific campaign.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "name": "Q1 2024 Campaign",
  "cpm": 500,
  "status": "active",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-03-31T23:59:59Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `404` - Campaign not found

---

#### PATCH /campaigns/:id

Update a campaign.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request:**
```json
{
  "status": "paused"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "name": "Q1 2024 Campaign",
  "cpm": 500,
  "status": "paused",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-03-31T23:59:59Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- `404` - Campaign not found

---

### Creatives

#### GET /creatives

List all creatives for the authenticated account.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "campaign_id": "uuid",
    "account_id": "uuid",
    "name": "Banner 728x90",
    "creative_url": "https://cdn.example.com/banner.jpg",
    "width": 728,
    "height": 90,
    "click_url": "https://advertiser.com/landing",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST /creatives

Create a new creative.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request:**
```json
{
  "campaign_id": "uuid",
  "name": "Banner 728x90",
  "creative_url": "https://cdn.example.com/banner.jpg",
  "width": 728,
  "height": 90,
  "click_url": "https://advertiser.com/landing"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "campaign_id": "uuid",
  "account_id": "uuid",
  "name": "Banner 728x90",
  "creative_url": "https://cdn.example.com/banner.jpg",
  "width": 728,
  "height": 90,
  "click_url": "https://advertiser.com/landing",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

#### POST /creatives/ad-unit-campaigns

Assign a campaign to an ad unit.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request:**
```json
{
  "ad_unit_id": "uuid",
  "campaign_id": "uuid",
  "priority": 10
}
```

**Field Notes:**
- `priority`: Higher number = higher priority (default: 0)

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "ad_unit_id": "uuid",
  "campaign_id": "uuid",
  "account_id": "uuid",
  "priority": 10,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

#### GET /creatives/ad-unit-campaigns

List all ad unit campaign assignments.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "ad_unit_id": "uuid",
    "campaign_id": "uuid",
    "account_id": "uuid",
    "priority": 10,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## Ad Server API

### POST /ad/request

Request an ad for display.

**Request:**
```json
{
  "ad_unit_id": "uuid",
  "page_url": "https://blog.example.com/article",
  "user_agent": "Mozilla/5.0..."
}
```

**Response:** `200 OK`
```json
{
  "creative_url": "https://cdn.example.com/banner.jpg",
  "tracking_pixels": [
    "http://localhost:3003/event/impression?ad_unit_id=uuid&campaign_id=uuid&creative_id=uuid&page_url=https%3A%2F%2Fblog.example.com%2Farticle&timestamp=1704067200000"
  ]
}
```

**No-Fill Response:** `200 OK`
```json
{
  "creative_url": null,
  "tracking_pixels": []
}
```

**Performance:**
- Target: P95 <300ms
- Actual: ~50-150ms

**No-Fill Reasons:**
- Invalid ad_unit_id
- No active campaigns
- No matching creative sizes
- Rate limit exceeded

**Note:** This endpoint NEVER returns 5xx errors. Always returns 200 with either an ad or no-fill response.

---

### GET /metrics

Get Prometheus metrics.

**Response:** `200 OK` (text/plain)
```
# HELP http_request_duration_ms Duration of HTTP requests in milliseconds
# TYPE http_request_duration_ms histogram
http_request_duration_ms_bucket{method="POST",route="/ad/request",status_code="200",le="10"} 45
http_request_duration_ms_bucket{method="POST",route="/ad/request",status_code="200",le="50"} 198
...

# HELP ad_requests_total Total number of ad requests
# TYPE ad_requests_total counter
ad_requests_total{ad_unit_id="uuid",filled="true"} 1523
ad_requests_total{ad_unit_id="uuid",filled="false"} 47
...
```

---

## Analytics Ingest API

### POST /event/impression

Track an ad impression.

**Query Parameters:**
- `ad_unit_id` (required): UUID
- `campaign_id` (required): UUID
- `creative_id` (required): UUID
- `page_url` (required): URL
- `timestamp` (required): Unix timestamp in milliseconds

**Example:**
```http
POST /event/impression?ad_unit_id=uuid&campaign_id=uuid&creative_id=uuid&page_url=https%3A%2F%2Fexample.com&timestamp=1704067200000
```

**Response:** `204 No Content`

**Performance:**
- Target: P95 <50ms
- Actual: ~10-30ms

**Notes:**
- Always returns 204 (even on errors)
- Fire-and-forget pattern
- Events batched every 5 seconds

---

### POST /event/click

Track an ad click.

**Query Parameters:**
- `ad_unit_id` (required): UUID
- `campaign_id` (required): UUID
- `creative_id` (required): UUID
- `page_url` (required): URL
- `timestamp` (required): Unix timestamp in milliseconds

**Example:**
```http
POST /event/click?ad_unit_id=uuid&campaign_id=uuid&creative_id=uuid&page_url=https%3A%2F%2Fexample.com&timestamp=1704067200000
```

**Response:** `204 No Content`

---

## Reporting API

### GET /metrics

Get aggregated metrics for a date range.

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date` (required): Format YYYY-MM-DD
- `end_date` (required): Format YYYY-MM-DD
- `ad_unit_id` (optional): Filter by ad unit UUID
- `campaign_id` (optional): Filter by campaign UUID

**Example:**
```http
GET /metrics?start_date=2024-01-01&end_date=2024-01-31
```

**Response:** `200 OK`
```json
{
  "impressions": 150000,
  "clicks": 1500,
  "revenue": 75000,
  "fill_rate": 95.67
}
```

**Field Notes:**
- `impressions`: Total impression count
- `clicks`: Total click count
- `revenue`: Total revenue in cents (based on CPM)
- `fill_rate`: Percentage (0-100) of requests that were filled

**Caching:**
- Redis cached for 5 minutes
- Data freshness: ≤5 minutes

---

## Common Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error: email is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

**Note:** The Ad Server API never returns 5xx. It fails closed with a no-fill response instead.

---

## Rate Limits

### Ad Server
- 1000 requests per minute per IP
- Exceeding limit returns no-fill response

### Analytics Ingest
- No rate limit (designed for high throughput)

### Control Plane & Reporting
- No rate limit (protected by authentication)

---

## Data Types

### UUID Format
```
00000000-0000-0000-0000-000000000000
```

### Date Format
```
YYYY-MM-DD
```

### Timestamp Format
Unix timestamp in milliseconds:
```
1704067200000
```

### CPM Format
Integer in cents:
```
500  // = $5.00 CPM
```

---

## JavaScript Tag Integration

```html
<div class="b2b-ad-unit"
     data-ad-unit-id="YOUR-AD-UNIT-ID"
     data-ad-server="http://localhost:3001"
     data-timeout="500">
</div>

<script src="/path/to/ad-tag.js"></script>
```

The tag automatically:
1. Calls `POST /ad/request` on the ad server
2. Renders the creative if returned
3. Fires tracking pixels on image load
4. Handles timeouts gracefully

---

For more details, see the main [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
