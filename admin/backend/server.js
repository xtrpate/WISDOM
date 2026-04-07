// server.js – WISDOM Unified Backend entry point
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const adminRoutes = require("./routes/admin"); // Admin central router
const { errorHandler } = require("./middleware/errorHandler");
const { startCronJobs } = require("./services/cronService");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Fix for X-Forwarded-For / express-rate-limit proxy issue
app.set("trust proxy", 1);

// ── Security ──────────────────────────────────────────────────────────────────
// 👉 FIX 1: Updated Helmet to allow images to load on the frontend
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  message: { message: "Too many requests. Please try again later." },
});

app.use("/api", limiter);

// ── Static File Serving ───────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/backups", express.static(path.join(__dirname, "backups")));

// ── Unified API Routes ────────────────────────────────────────────────────────

// 👉 FIX 2: Added Public Routes for Home & FAQ pages (No login required)
app.use("/api/public", require("./routes/public"));

// 1. Admin Routes (Mounted at /api directly to preserve existing frontend calls)
app.use("/api", adminRoutes);

// 2. Customer Routes
app.use("/api/customer/auth", require("./routes/customer.auth"));
app.use("/api/customer/products", require("./routes/customer.products"));
app.use("/api/customer/orders", require("./routes/customer.orders"));
app.use("/api/customer/profile", require("./routes/customer.profile"));
app.use("/api/customer/blueprints", require("./routes/customer.blueprints"));
app.use(
  "/api/customer/appointments",
  require("./routes/customer.appointments"),
);
app.use("/api/customer/warranty", require("./routes/customer.warranty"));
app.use(
  "/api/customer/custom-orders",
  require("./routes/customer.customorders"),
);

// 3. Staff / POS Routes
app.use("/api/pos/dashboard", require("./routes/pos.dashboard"));
app.use("/api/pos/products", require("./routes/pos.products"));
app.use("/api/pos/orders", require("./routes/pos.orders"));
app.use("/api/pos/blueprints", require("./routes/pos.blueprints"));
app.use("/api/pos/tasks", require("./routes/pos.tasks"));
app.use("/api/pos", require("./routes/pos.fulfillment"));
app.use("/api/pos", require("./routes/pos.schedule"));
app.use("/api/pos", require("./routes/pos.receipts"));
app.use("/api/pos/reports", require("./routes/pos.reports")); // Updated to match our new reports setup

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1 AS ok");
    res.json({
      status: "ok",
      db: "connected",
      system: "WISDOM Unified System",
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      message: err.message,
      timestamp: new Date(),
    });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  WISDOM Unified API running on http://localhost:${PORT}`);
  console.log(`    Environment: ${process.env.NODE_ENV || "development"}\n`);

  // Start automated backup cron jobs
  startCronJobs();
});

module.exports = app;
