// routes/pos.receipts.js
const express = require("express");
const router = express.Router();
const { authenticate, requireStaffOrAdmin } = require("../middleware/auth");
const posReceiptsController = require("../controllers/staff/pos.receipts");

const posAccess = [authenticate, requireStaffOrAdmin];

/* ══════════════════════════════════════════════════════════════
   STAFF/POS RECEIPTS & REPORTS ROUTES
══════════════════════════════════════════════════════════════ */

router.get("/receipts", posAccess, posReceiptsController.getReceiptByOrderId);
router.get("/receipts/:id", posAccess, posReceiptsController.getReceiptById);
router.get("/reports", posAccess, posReceiptsController.getReports);

module.exports = router;
