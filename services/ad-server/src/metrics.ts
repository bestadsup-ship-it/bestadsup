import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 300, 500, 1000, 2000],
});

const adRequestCounter = new client.Counter({
  name: 'ad_requests_total',
  help: 'Total number of ad requests',
  labelNames: ['ad_unit_id', 'filled'],
});

const noFillReasonCounter = new client.Counter({
  name: 'ad_no_fill_total',
  help: 'Total number of no-fill responses by reason',
  labelNames: ['reason'],
});

const cacheHitCounter = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key_type'],
});

const cacheMissCounter = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key_type'],
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in milliseconds',
  labelNames: ['query_type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(adRequestCounter);
register.registerMetric(noFillReasonCounter);
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);
register.registerMetric(dbQueryDuration);

export const metrics = {
  register,
  httpRequestDuration,
  adRequestCounter,
  noFillReasonCounter,
  cacheHitCounter,
  cacheMissCounter,
  dbQueryDuration,
};
