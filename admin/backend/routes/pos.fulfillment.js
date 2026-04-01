// routes/pos.fulfillment.js
const express = require("express");
const router = express.Router();
const { authenticate, requireStaffOrAdmin } = require("../middleware/auth");
const posFulfillmentController = require("../controllers/staff/pos.fulfillment");

const posAccess = [authenticate, requireStaffOrAdmin];

/* ══════════════════════════════════════════════════════════════
   STAFF/POS DELIVERIES
══════════════════════════════════════════════════════════════ */
router.get("/deliveries", posAccess, posFulfillmentController.getDeliveries);
router.post("/deliveries", posAccess, posFulfillmentController.createDelivery);
router.patch(
  "/deliveries/:id/status",
  posAccess,
  posFulfillmentController.updateDeliveryStatus,
);

/* ══════════════════════════════════════════════════════════════
   STAFF/POS APPOINTMENTS
══════════════════════════════════════════════════════════════ */
router.get(
  "/appointments",
  posAccess,
  posFulfillmentController.getAppointments,
);
router.post(
  "/appointments",
  posAccess,
  posFulfillmentController.createAppointment,
);
router.patch(
  "/appointments/:id",
  posAccess,
  posFulfillmentController.updateAppointment,
);

/* Backward-compatible route */
router.patch("/appointments/:id/status", posAccess, (req, res, next) => {
  posFulfillmentController.updateAppointment(req, res, next);
});

module.exports = router;
