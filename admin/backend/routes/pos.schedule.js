// routes/pos.schedule.js
const express = require("express");
const router = express.Router();
const { authenticate, requireStaffOrAdmin } = require("../middleware/auth");
const posScheduleController = require("../controllers/staff/pos.schedule");

const posAccess = [authenticate, requireStaffOrAdmin];

/* ══════════════════════════════════════════════════════════════
   STAFF/POS APPOINTMENTS ROUTES
══════════════════════════════════════════════════════════════ */

router.get("/appointments", posAccess, posScheduleController.getAppointments);
router.post(
  "/appointments",
  posAccess,
  posScheduleController.createAppointment,
);
router.patch(
  "/appointments/:id",
  posAccess,
  posScheduleController.updateAppointment,
);

module.exports = router;
