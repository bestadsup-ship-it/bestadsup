import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { authRouter } from './routes/auth';
import { accountsRouter } from './routes/accounts';
import { propertiesRouter } from './routes/properties';
import { adUnitsRouter } from './routes/ad-units';
import { campaignsRouter } from './routes/campaigns';
import { creativesRouter } from './routes/creatives';
import postsRouter from './routes/posts';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize database
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/properties', propertiesRouter);
app.use('/ad-units', adUnitsRouter);
app.use('/campaigns', campaignsRouter);
app.use('/creatives', creativesRouter);
app.use('/posts', postsRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Control Plane API running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://192.168.1.168:${PORT}`);
});
