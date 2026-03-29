const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');

// GET /api/pos/receipts/:id
router.get('/receipts/:id', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.*, o.order_number, o.walkin_customer_name, o.walkin_customer_phone,
             o.payment_method, o.subtotal, o.tax, o.discount, o.total,
             o.notes, u.name AS staff_name
      FROM receipts r
      JOIN orders o ON o.id = r.order_id
      LEFT JOIN users u ON u.id = r.issued_by
      WHERE r.id = ?
    `, [req.params.id]);

    if (rows.length === 0)
      return res.status(404).json({ message: 'Receipt not found' });

    const receipt = rows[0];
    receipt.items = JSON.parse(receipt.items_snapshot || '[]');

    // Fetch business settings using correct keys from wisdom_db seed data
    // Seed data keys: 'site_name', 'site_logo'
    // 'business_address' and 'business_phone' are not seeded — fetch all and use what's available
    const [settings] = await db.execute(`
      SELECT setting_key, value FROM website_settings
      WHERE setting_key IN ('site_name', 'site_logo', 'business_address', 'business_phone', 'gcash_number')
    `);
    const biz = {};
    settings.forEach(s => { biz[s.setting_key] = s.value; });

    // Normalize: site_name is the business name in the seed data
    biz.business_name = biz.site_name || 'Spiral Wood Services';
    receipt.business = biz;

    res.json(receipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pos/receipts?order_id=x
router.get('/receipts', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ message: 'order_id required' });
  try {
    const [rows] = await db.execute(
      'SELECT * FROM receipts WHERE order_id = ?',
      [order_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pos/reports — POS sales reports
router.get('/reports', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { period = 'daily', from, to, staff_id } = req.query;

  let groupBy, dateExpr;
  switch (period) {
    case 'weekly':
      dateExpr = 'YEARWEEK(o.created_at, 1)';
      groupBy = dateExpr;
      break;
    case 'monthly':
      dateExpr = "DATE_FORMAT(o.created_at, '%Y-%m')";
      groupBy = dateExpr;
      break;
    case 'yearly':
      dateExpr = 'YEAR(o.created_at)';
      groupBy = dateExpr;
      break;
    default:
      dateExpr = 'DATE(o.created_at)';
      groupBy = dateExpr;
  }

  try {
    let where = "WHERE o.type = 'walkin' AND o.status NOT IN ('cancelled')";
    const params = [];

    if (from)  { where += ' AND DATE(o.created_at) >= ?'; params.push(from); }
    if (to)    { where += ' AND DATE(o.created_at) <= ?'; params.push(to); }

    // Staff can only see reports for orders they processed (issued receipt).
    // Use INNER JOIN when filtering by staff to avoid LEFT JOIN hiding orders.
    // Admin with no staff_id filter uses LEFT JOIN to see all orders.
    const receiptJoin = (staff_id && req.user.role === 'admin') || req.user.role === 'staff'
      ? 'INNER JOIN receipts r ON r.order_id = o.id'
      : 'LEFT JOIN receipts r ON r.order_id = o.id';

    if (staff_id && req.user.role === 'admin') {
      where += ' AND r.issued_by = ?';
      params.push(staff_id);
    } else if (req.user.role === 'staff') {
      where += ' AND r.issued_by = ?';
      params.push(req.user.id);
    }

    // Summary by period
    const [summary] = await db.execute(`
      SELECT ${dateExpr} AS period_label,
             COUNT(o.id) AS order_count,
             COALESCE(SUM(o.subtotal), 0) AS subtotal,
             COALESCE(SUM(o.discount), 0) AS discount,
             COALESCE(SUM(o.total), 0) AS total_sales
      FROM orders o
      ${receiptJoin}
      ${where}
      GROUP BY ${groupBy}
      ORDER BY period_label DESC
      LIMIT 30
    `, params);

    // Overall totals
    const [totals] = await db.execute(`
      SELECT COUNT(o.id) AS total_orders,
             COALESCE(SUM(o.total), 0) AS grand_total,
             COALESCE(SUM(o.discount), 0) AS total_discount
      FROM orders o
      ${receiptJoin}
      ${where}
    `, params);

    // Top selling products
    const [topProducts] = await db.execute(`
      SELECT oi.product_name,
             SUM(oi.quantity) AS qty,
             COALESCE(SUM(oi.subtotal), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${receiptJoin}
      ${where}
      GROUP BY oi.product_name
      ORDER BY qty DESC
      LIMIT 10
    `, params);

    // Payment method breakdown
    const [paymentBreakdown] = await db.execute(`
      SELECT o.payment_method, COUNT(*) AS count,
             COALESCE(SUM(o.total), 0) AS total
      FROM orders o
      ${receiptJoin}
      ${where}
      GROUP BY o.payment_method
    `, params);

    res.json({
      summary,
      totals: totals[0],
      top_products: topProducts,
      payment_breakdown: paymentBreakdown
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
