// routes/pos.tasks.js
const express = require("express");
const router = express.Router();
const { authenticate, requireStaffOrAdmin } = require("../middleware/auth");
const posTasksController = require("../controllers/staff/pos.tasks");

const posAccess = [authenticate, requireStaffOrAdmin];

/* ══════════════════════════════════════════════════════════════
   STAFF/POS TASKS & NOTIFICATIONS ROUTES
══════════════════════════════════════════════════════════════ */

router.get("/notifications", posAccess, posTasksController.getNotifications);
router.put(
  "/notifications/:id/read",
  posAccess,
  posTasksController.markNotificationRead,
);

router.get("/projects", posAccess, posTasksController.getProjects);
router.get("/staff", posAccess, posTasksController.getStaff);
router.get("/unread-count", posAccess, posTasksController.getUnreadCount);

router.get("/", posAccess, posTasksController.getTasks);
router.post("/", posAccess, posTasksController.createTask);
router.put("/:id/accept", posAccess, posTasksController.acceptTask);
router.put("/:id/status", posAccess, posTasksController.updateTaskStatus);

module.exports = router;
