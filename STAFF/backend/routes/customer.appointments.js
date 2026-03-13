/**
 * routes/customer.appointments.js
 *
 * POST /api/customer/appointments     — book an appointment
 * GET  /api/customer/appointments     — list customer's own appointments
 * DELETE /api/customer/appointments/:id — cancel a pending appointment
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const requireCustomer = (req, res, next) => {
  if (req.user.role !== "customer")
    return res.status(403).json({ message: "Customer access only." });
  next();
};

/* ── POST /api/customer/appointments ── */
router.post("/", authenticate, requireCustomer, async (req, res) => {
  const { purpose, preferred_date, preferred_time, contact_number, notes } =
    req.body;

  if (!purpose || !preferred_date || !preferred_time || !contact_number) {
    return res.status(400).json({
      message:
        "Project description, preferred date, time, and contact number are required.",
    });
  }

  // Combine date + time into scheduled_date datetime
  const scheduled_date = `${preferred_date} ${preferred_time}:00`;

  // Store contact number in notes
  const fullNotes = contact_number
    ? `Contact: ${contact_number}${notes ? `\n${notes}` : ""}`
    : notes || null;

  try {
    const [result] = await db.execute(
      `INSERT INTO appointments
         (order_id, assigned_to, purpose, scheduled_date, preferred_date, status, notes, customer_id)
       VALUES (NULL, NULL, ?, ?, ?, 'pending', ?, ?)`,
      [purpose, scheduled_date, preferred_date, fullNotes, req.user.id],
    );

    res.status(201).json({
      message: "Appointment booked successfully!",
      appointment_id: result.insertId,
    });
  } catch (err) {
    // If customer_id column doesn't exist yet, retry without it
    if (err.code === "ER_BAD_FIELD_ERROR") {
      try {
        const [result2] = await db.execute(
          `INSERT INTO appointments
             (order_id, assigned_to, purpose, scheduled_date, preferred_date, status, notes)
           VALUES (NULL, NULL, ?, ?, ?, 'pending', ?)`,
          [purpose, scheduled_date, preferred_date, fullNotes],
        );
        return res.status(201).json({
          message: "Appointment booked successfully!",
          appointment_id: result2.insertId,
        });
      } catch (err2) {
        console.error("[customer.appointments POST fallback]", err2);
        return res
          .status(500)
          .json({ message: "Server error.", error: err2.message });
      }
    }
    console.error("[customer.appointments POST]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* ── GET /api/customer/appointments ── */
router.get("/", authenticate, requireCustomer, async (req, res) => {
  try {
    // Try with customer_id first
    let rows;
    try {
      [rows] = await db.execute(
        `SELECT id, purpose, scheduled_date, preferred_date, status, notes, created_at
         FROM appointments
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [req.user.id],
      );
    } catch {
      // Fallback: no customer_id column
      [rows] = await db.execute(
        `SELECT id, purpose, scheduled_date, preferred_date, status, notes, created_at
         FROM appointments
         ORDER BY created_at DESC
         LIMIT 50`,
      );
    }
    res.json(rows);
  } catch (err) {
    console.error("[customer.appointments GET]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* ── DELETE /api/customer/appointments/:id ── */
router.delete("/:id", authenticate, requireCustomer, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, status FROM appointments WHERE id = ?`,
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Appointment not found." });
    if (rows[0].status !== "pending")
      return res
        .status(400)
        .json({ message: "Only pending appointments can be cancelled." });

    await db.execute(
      `UPDATE appointments SET status = 'cancelled' WHERE id = ?`,
      [req.params.id],
    );
    res.json({ message: "Appointment cancelled." });
  } catch (err) {
    console.error("[customer.appointments DELETE]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

module.exports = router;
