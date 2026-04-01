// routes/customer.products.js
const express = require("express");
const router = express.Router();
const { authenticate, requireCustomer } = require("../middleware/auth");
const productController = require("../controllers/customer/customer.products");

/* ══════════════════════════════════════════════════════════════
   CUSTOMER PRODUCTS ROUTES
══════════════════════════════════════════════════════════════ */

router.get(
  "/",
  authenticate,
  requireCustomer,
  productController.getAllProducts,
);
router.get("/:id", authenticate, productController.getProductById);

module.exports = router;
