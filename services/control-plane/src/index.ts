import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { authRouter } from './routes/auth';
import { accountsRouter } from './routes/accounts';
import { propertiesRouter } from './routes/properties';
import { adUnitsRouter } from './routes/ad-units';
import { campaignsRouter } from './routes/campaigns';
import { creativesRouter } from './routes/creatives';

dotenv.config();

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
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/accounts', accountsRouter);
app.use('/properties', propertiesRouter);
app.use('/ad-units', adUnitsRouter);
app.use('/campaigns', campaignsRouter);
app.use('/creatives', creativesRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`Control Plane API running on port ${PORT}`);
});
