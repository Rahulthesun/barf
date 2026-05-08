import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import extractRoutes  from './routes/extractRoutes';
import buildRoutes    from './routes/buildRoutes';
import downloadRoutes from './routes/downloadRoutes';
import appsRoutes     from './routes/appsRoutes';
import deployRoutes   from './routes/deployRoutes';
import aiRoutes       from './routes/aiRoutes';
import { runAutoShutdown } from './services/azureContainerService';
import { browseLimit } from './middleware/rateLimiter';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS env var: comma-separated list for production.
// Falls back to localhost for local dev when not set.
const rawOrigins = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001';
const allowedOrigins = new Set(rawOrigins.split(',').map(o => o.trim()).filter(Boolean));

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server requests (no Origin header) and listed origins
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/extract',  extractRoutes);
app.use('/api/build',    buildRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/apps',     browseLimit, appsRoutes);
app.use('/api/deploy',   deployRoutes);
app.use('/api/ai',       aiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Check for idle containers every 5 minutes and stop them after 4 hours
  setInterval(() => { runAutoShutdown().catch(console.error); }, 5 * 60 * 1000);
});
