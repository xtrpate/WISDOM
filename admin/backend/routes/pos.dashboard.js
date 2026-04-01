// routes/pos.dashboard.js
const express = require("express");
const router = express.Router();
const { authenticate, requireStaffOrAdmin } = require("../middleware/auth");
const posDashboardController = require("../controllers/staff/pos.dashboard");

/* ══════════════════════════════════════════════════════════════
   STAFF/POS DASHBOARD ROUTES
══════════════════════════════════════════════════════════════ */

router.get(
  "/",
  authenticate,
  requireStaffOrAdmin,
  posDashboardController.getDashboardMetrics,
);

module.exports = router;
