// routes/customer.blueprints.js
const express = require("express");
const router = express.Router();
const { authenticate, requireCustomer } = require("../middleware/auth");
const blueprintController = require("../controllers/customer/customer.blueprints");

/* ══════════════════════════════════════════════════════════════
   CUSTOMER BLUEPRINTS ROUTES
══════════════════════════════════════════════════════════════ */

router.get(
  "/",
  authenticate,
  requireCustomer,
  blueprintController.getAllBlueprints,
);
router.get(
  "/:id",
  authenticate,
  requireCustomer,
  blueprintController.getBlueprintById,
);

module.exports = router;
