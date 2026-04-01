/**
 * routes/pos.tasks.js
 * Project Task Management and Staff Assignment Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");

// Simple authentication middleware check
const { authenticate, requireStaffOrAdmin } = require("../middleware/auth");

const posAccess = [authenticate, requireStaffOrAdmin];
/* ─────────────────────────────────────────────────
   GET /api/pos/tasks/notifications
   Get ALL notifications for the logged-in user (Admin or Staff)
───────────────────────────────────────────────── */
router.get("/notifications", ...posAccess, async (req, res) => {
  try {
    const [notifications] = await db.execute(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id],
    );
    res.json(notifications);
  } catch (err) {
    console.error("[pos.tasks GET /notifications]", err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

/* ─────────────────────────────────────────────────
   PUT /api/pos/tasks/notifications/:id/read
   Mark a specific notification as read
───────────────────────────────────────────────── */
router.put("/notifications/:id/read", ...posAccess, async (req, res) => {
  try {
    await db.execute(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id],
    );
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Error updating notification" });
  }
});

/* ─────────────────────────────────────────────────
   GET /api/pos/tasks/projects
   Get active projects (orders) requiring allocation
───────────────────────────────────────────────── */
router.get("/projects", ...posAccess, async (req, res) => {
  try {
    const [projects] = await db.execute(`
      SELECT o.id, o.order_number, o.walkin_customer_name as customer_name, 
             o.status, o.delivery_address, o.created_at,
             (SELECT COUNT(*) FROM project_tasks pt WHERE pt.order_id = o.id) as assigned_tasks_count
      FROM orders o
      WHERE o.status IN ('confirmed', 'production')
      ORDER BY o.created_at DESC
    `);
    res.json(projects);
  } catch (err) {
    console.error("[pos.tasks GET /projects]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* ─────────────────────────────────────────────────
   GET /api/pos/tasks/staff
   Get list of active staff members and their current workload
───────────────────────────────────────────────── */
router.get("/staff", ...posAccess, async (req, res) => {
  try {
    const [staff] = await db.execute(
      `SELECT su.id, su.name, su.role, su.phone,
              (SELECT COUNT(*) FROM project_tasks pt WHERE pt.assigned_to = su.id AND pt.status IN ('pending', 'in_progress')) as active_tasks
       FROM staff_users su 
       WHERE su.is_active = 1`,
    );
    res.json(staff);
  } catch (err) {
    console.error("[pos.tasks GET /staff]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* ─────────────────────────────────────────────────
   GET /api/pos/tasks/unread-count
   Get number of unread tasks and notifications
───────────────────────────────────────────────── */
router.get("/unread-count", ...posAccess, async (req, res) => {
  try {
    // 1. Task unread count (for staff red dot on sidebar)
    const [taskRows] = await db.execute(
      `SELECT COUNT(*) as count FROM project_tasks WHERE assigned_to = ? AND is_read = 0`,
      [req.user.id],
    );

    // 2. Notification unread count (for the bell icon for both admin and staff)
    const [notifRows] = await db.execute(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id],
    );

    res.json({
      task_count: taskRows[0].count,
      notification_count: notifRows[0].count,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching unread count" });
  }
});

/* ─────────────────────────────────────────────────
   GET /api/pos/tasks
   Get tasks (Admin sees all, Staff sees their own)
───────────────────────────────────────────────── */
router.get("/", ...posAccess, async (req, res) => {
  try {
    let query = `
      SELECT t.*, 
             s.name as assigned_to_name, 
             a.name as assigned_by_name, 
             o.order_number, o.delivery_address
      FROM project_tasks t
      LEFT JOIN staff_users s ON t.assigned_to = s.id
      LEFT JOIN staff_users a ON t.assigned_by = a.id
      LEFT JOIN orders o ON t.order_id = o.id
    `;
    let queryParams = [];

    if (req.user.role !== "admin") {
      query += ` WHERE t.assigned_to = ?`;
      queryParams.push(req.user.id);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [tasks] = await db.execute(query, queryParams);
    res.json(tasks);
  } catch (err) {
    console.error("[pos.tasks GET /]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* ─────────────────────────────────────────────────
   POST /api/pos/tasks
   Create/Assign a new task to a staff member
───────────────────────────────────────────────── */
router.post("/", ...posAccess, async (req, res) => {
  const {
    order_id,
    blueprint_id,
    assigned_to,
    task_role,
    title,
    description,
    due_date,
  } = req.body;

  if (!assigned_to || !title) {
    return res
      .status(400)
      .json({ message: "Assigned staff and task title are required." });
  }

  try {
    if (order_id) {
      await db.execute(
        `UPDATE orders SET status = 'production' WHERE id = ? AND status = 'confirmed'`,
        [order_id],
      );
    }

    const [result] = await db.execute(
      `INSERT INTO project_tasks 
        (order_id, blueprint_id, assigned_to, assigned_by, task_role, title, description, due_date, status, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        order_id || null,
        blueprint_id || null,
        assigned_to,
        req.user.id,
        task_role || "Other",
        title,
        description || "",
        due_date || null,
      ],
    );

    // ADDED: Send a notification to the staff member letting them know they have a new task
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, channel, sent_at) 
       VALUES (?, 'assignment', 'New Task Assigned', ?, 'system', NOW())`,
      [assigned_to, `You have been assigned a new task: ${title}`],
    );

    res.status(201).json({
      message: "Task assigned successfully.",
      task_id: result.insertId,
    });
  } catch (err) {
    console.error("[pos.tasks POST /]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* ─────────────────────────────────────────────────
   PUT /api/pos/tasks/:id/accept
   Staff accepts a task - Marks as read and changes status
───────────────────────────────────────────────── */
router.put("/:id/accept", ...posAccess, async (req, res) => {
  try {
    // 1. Fetch the task details first to get the admin's ID
    const [tasks] = await db.execute(
      `SELECT * FROM project_tasks WHERE id = ? AND assigned_to = ?`,
      [req.params.id, req.user.id],
    );

    if (tasks.length === 0) {
      return res.status(400).json({ message: "Task not found." });
    }
    const task = tasks[0];

    // 2. Update the task status
    const [result] = await db.execute(
      `UPDATE project_tasks SET status = 'in_progress', is_read = 1, accepted_at = NOW() 
       WHERE id = ? AND status = 'pending'`,
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ message: "Task already accepted or blocked." });
    }

    // 3. ADDED: Insert notification for the Admin (assigned_by)
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, channel, sent_at) 
       VALUES (?, 'task_update', 'Task Accepted', ?, 'system', NOW())`,
      [
        task.assigned_by,
        `${req.user.name || "A staff member"} has accepted the task: ${task.title}`,
      ],
    );

    res.json({ message: "Assignment accepted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error accepting task" });
  }
});

/* ─────────────────────────────────────────────────
   PUT /api/pos/tasks/:id/status
   Update task status 
───────────────────────────────────────────────── */
router.put("/:id/status", ...posAccess, async (req, res) => {
  const { status } = req.body;
  const taskId = req.params.id;

  const validStatuses = ["pending", "in_progress", "completed", "blocked"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  try {
    const completedAt = status === "completed" ? new Date() : null;
    let query = `UPDATE project_tasks SET status = ?, completed_at = ?, is_read = 1 WHERE id = ?`;
    let queryParams = [status, completedAt, taskId];

    if (req.user.role !== "admin") {
      query += ` AND assigned_to = ?`;
      queryParams.push(req.user.id);
    }

    const [result] = await db.execute(query, queryParams);

    if (result.affectedRows === 0) {
      return res
        .status(403)
        .json({ message: "Task not found or unauthorized to update." });
    }

    res.json({ message: "Task status updated successfully." });
  } catch (err) {
    console.error("[pos.tasks PUT /:id/status]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

module.exports = router;
