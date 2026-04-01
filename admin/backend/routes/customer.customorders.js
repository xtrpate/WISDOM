// routes/customer.customorders.js
const express = require("express");
const router = express.Router();
const { authenticate, requireCustomer } = require("../middleware/auth");
const customOrderController = require("../controllers/customer/customer.customorders");

/* ══════════════════════════════════════════════════════════════
   CUSTOMER CUSTOM ORDERS ROUTES
══════════════════════════════════════════════════════════════ */

router.post(
  "/",
  authenticate,
  requireCustomer,
  customOrderController.createCustomOrder,
);
router.get(
  "/",
  authenticate,
  requireCustomer,
  customOrderController.getCustomOrders,
);

module.exports = router;
