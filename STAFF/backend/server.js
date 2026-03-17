const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/customer/auth", require("./routes/customer.auth"));
app.use("/api/customer/products", require("./routes/customer.products"));
app.use("/api/customer/orders", require("./routes/customer.orders"));
app.use("/api/customer/settings", require("./routes/customer.orders"));
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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// POS-specific routes — ORDER MATTERS: specific paths before general /api/pos
app.use("/api/pos/dashboard", require("./routes/pos.dashboard")); // GET /api/pos/dashboard
app.use("/api/pos/products", require("./routes/pos.products")); // GET /api/pos/products, /api/pos/products/all
app.use("/api/pos/orders", require("./routes/pos.orders")); // POST/GET /api/pos/orders
app.use("/api/pos/blueprints", require("./routes/pos.blueprints")); // GET /api/pos/blueprints

// These handle /api/pos/deliveries, /api/pos/appointments, /api/pos/receipts, /api/pos/reports
app.use("/api/pos", require("./routes/pos.schedule"));
app.use("/api/pos", require("./routes/pos.receipts"));

// ─── Health check ─────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "WISDOM POS Backend running" }),
);

// ─── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Unexpected server error", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`WISDOM POS Backend running on port ${PORT}`);
});
