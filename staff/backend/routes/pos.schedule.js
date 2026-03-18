const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');

// ─── DELIVERIES ────────────────────────────────────────────────

// POST /api/pos/deliveries - schedule delivery
router.post('/deliveries', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { order_id, address, scheduled_date, notes } = req.body;
  if (!order_id || !address || !scheduled_date)
    return res.status(400).json({ message: 'order_id, address, and scheduled_date required' });

  try {
    // Auto-assign available driver (users with role=staff who have fewest deliveries today)
    const [drivers] = await db.execute(`
      SELECT u.id, u.name, COUNT(d.id) AS active_deliveries
      FROM users u
      LEFT JOIN deliveries d ON d.driver_id = u.id
        AND d.status IN ('scheduled','in_transit')
      WHERE u.role = 'staff' AND u.is_active = 1
      GROUP BY u.id, u.name
      ORDER BY active_deliveries ASC
      LIMIT 1
    `);

    const driver_id = drivers.length > 0 ? drivers[0].id : null;

    const [result] = await db.execute(`
      INSERT INTO deliveries (order_id, driver_id, scheduled_date, address, status, notes)
      VALUES (?, ?, ?, ?, 'scheduled', ?)
    `, [order_id, driver_id, scheduled_date, address, notes || null]);

    // Update order status to shipping
    await db.execute(
      "UPDATE orders SET status = 'shipping' WHERE id = ?",
      [order_id]
    );

    res.json({
      message: 'Delivery scheduled',
      delivery_id: result.insertId,
      assigned_driver: drivers[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pos/deliveries - list deliveries (staff sees their own)
router.get('/deliveries', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = `
      SELECT d.*, o.order_number, o.walkin_customer_name,
             u.name AS driver_name
      FROM deliveries d
      JOIN orders o ON o.id = d.order_id
      LEFT JOIN users u ON u.id = d.driver_id
      ${!isAdmin ? 'WHERE d.driver_id = ?' : ''}
      ORDER BY d.scheduled_date ASC
    `;
    const params = !isAdmin ? [req.user.id] : [];
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── APPOINTMENTS ──────────────────────────────────────────────

// POST /api/pos/appointments - schedule appointment
router.post('/appointments', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { order_id, purpose, scheduled_date, preferred_date, notes } = req.body;
  if (!purpose || !scheduled_date)
    return res.status(400).json({ message: 'purpose and scheduled_date required' });

  try {
    // Auto-assign available cabinet maker/installer
    const [makers] = await db.execute(`
      SELECT u.id, u.name, COUNT(a.id) AS active_appointments
      FROM users u
      LEFT JOIN appointments a ON a.assigned_to = u.id
        AND a.status IN ('pending','confirmed')
        AND DATE(a.scheduled_date) = DATE(?)
      WHERE u.role = 'staff' AND u.is_active = 1
      GROUP BY u.id, u.name
      ORDER BY active_appointments ASC
      LIMIT 1
    `, [scheduled_date]);

    const assigned_to = makers.length > 0 ? makers[0].id : null;

    const [result] = await db.execute(`
      INSERT INTO appointments
        (order_id, assigned_to, purpose, scheduled_date, preferred_date, status, notes)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `, [order_id || null, assigned_to, purpose, scheduled_date,
        preferred_date || null, notes || null]);

    res.json({
      message: 'Appointment scheduled',
      appointment_id: result.insertId,
      assigned_to: makers[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pos/appointments
router.get('/appointments', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = `
      SELECT a.*, o.order_number, u.name AS assigned_to_name
      FROM appointments a
      LEFT JOIN orders o ON o.id = a.order_id
      LEFT JOIN users u ON u.id = a.assigned_to
      ${!isAdmin ? 'WHERE a.assigned_to = ?' : ''}
      ORDER BY a.scheduled_date ASC
    `;
    const params = !isAdmin ? [req.user.id] : [];
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
