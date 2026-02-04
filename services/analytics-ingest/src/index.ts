import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createEventRouter } from './routes/event';
import { createHealthRouter } from './routes/health';
import { initializeDatabase } from './db';
import { eventBuffer } from './event-buffer';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 3003;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Disable body parsing for maximum speed (we use query params)
// app.use(express.json()); // Not needed for tracking pixels

// Routes
app.use('/health', createHealthRouter());
app.use('/event', createEventRouter());

// Catch-all error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  // Always return 204 to avoid blocking tracking pixels
  res.status(204).send();
});

// Start server
async function start() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Analytics Ingest Service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Buffer flush interval: 5 seconds`);
      console.log(`Max buffer size: 100 events`);
    });
  } catch (error) {
    console.error('Failed to start Analytics Ingest Service:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);

  try {
    // Flush remaining events
    await eventBuffer.shutdown();
    console.log('Event buffer flushed');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
