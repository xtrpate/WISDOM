// server.js – WISDOM Admin Backend entry point
require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const routes              = require('./routes/index');
const { errorHandler }    = require('./middleware/errorHandler');
const { startCronJobs }   = require('./services/cronService');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      [process.env.FRONTEND_URL, process.env.ADMIN_URL],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)       || 200,
  message:  { message: 'Too many requests. Please try again later.' },
}));

// ── Static File Serving ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/backups',  express.static(path.join(__dirname, 'backups')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health Check ──────────────────────────────────────────────────────────────
const pool = require('./config/db');
app.get('/health', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: err.message, timestamp: new Date() });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  WISDOM Admin API running on http://localhost:${PORT}`);
  console.log(`    Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Start automated backup cron jobs
  startCronJobs();
});

module.exports = app;
