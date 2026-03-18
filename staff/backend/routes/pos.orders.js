const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');

// Generate a unique walk-in order number, retrying up to 5 times on collision.
// Format: WLK-YYYYMMDD-XXXX  (XXXX = 4-digit random suffix)
const generateOrderNumber = async (conn) => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const candidate = `WLK-${datePart}-${suffix}`;

    const [existing] = await conn.execute(
      'SELECT id FROM orders WHERE order_number = ? LIMIT 1',
      [candidate]
    );

    if (existing.length === 0) return candidate;
    // Collision — loop and try a new suffix
  }

  // Fallback: use timestamp-based suffix (virtually no collision risk)
  return `WLK-${datePart}-${Date.now().toString().slice(-6)}`;
};

// POST /api/pos/orders — create walk-in order
router.post('/', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { customer_name, customer_phone, items, payment_method, discount = 0, notes } = req.body;

  if (!items || items.length === 0)
    return res.status(400).json({ message: 'No items in order' });
  if (!payment_method)
    return res.status(400).json({ message: 'Payment method is required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += parseFloat(item.unit_price) * parseInt(item.quantity);
    }
    const tax = 0;
    const discountAmt = parseFloat(discount) || 0;
    const total = subtotal + tax - discountAmt;

    // Create order record
    const orderNumber = await generateOrderNumber(conn);
    const [orderResult] = await conn.execute(`
      INSERT INTO orders
        (order_number, walkin_customer_name, walkin_customer_phone,
         type, order_type, status, payment_method, payment_status,
         subtotal, tax, discount, total, notes)
      VALUES (?, ?, ?, 'walkin', 'standard', 'confirmed', ?, 'paid',
              ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      customer_name || 'Walk-in Customer',
      customer_phone || null,
      payment_method,
      subtotal, tax, discountAmt, total,
      notes || null
    ]);

    const orderId = orderResult.insertId;

    // Insert order items, deduct stock, log movements
    for (const item of items) {
      // Insert order item
      // NOTE: subtotal and profit_margin are GENERATED columns in order_items — do NOT insert them
      const [itemResult] = await conn.execute(`
        INSERT INTO order_items
          (order_id, product_id, variation_id, product_name, quantity,
           unit_price, production_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.product_id,
        item.variation_id || null,
        item.product_name,
        parseInt(item.quantity),
        parseFloat(item.unit_price),
        parseFloat(item.production_cost) || 0
      ]);

      const orderItemId = itemResult.insertId;

      // Deduct stock from variation or product
      if (item.variation_id) {
        await conn.execute(
          'UPDATE product_variations SET stock = stock - ? WHERE id = ?',
          [parseInt(item.quantity), item.variation_id]
        );
      } else {
        await conn.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [parseInt(item.quantity), item.product_id]
        );
        // Recalculate stock_status based on new stock level
        await conn.execute(`
          UPDATE products SET stock_status =
            CASE
              WHEN stock <= 0          THEN 'out_of_stock'
              WHEN stock <= reorder_point THEN 'low_stock'
              ELSE                         'in_stock'
            END
          WHERE id = ?
        `, [item.product_id]);
      }

      // Log stock movement — include order_item_id for full traceability
      await conn.execute(`
        INSERT INTO stock_movements
          (product_id, type, quantity, order_id, order_item_id, notes, created_by)
        VALUES (?, 'out', ?, ?, ?, 'POS walk-in sale', ?)
      `, [item.product_id, parseInt(item.quantity), orderId, orderItemId, req.user.id]);
    }

    // Record payment transaction as verified (cash is immediate)
    await conn.execute(`
      INSERT INTO payment_transactions
        (order_id, amount, payment_method, status, verified_by, verified_at)
      VALUES (?, ?, ?, 'verified', ?, NOW())
    `, [orderId, total, payment_method, req.user.id]);

    // Generate official receipt
    const receiptNumber = `OR-${Date.now()}`;
    const itemsSnapshot = JSON.stringify(items);

    const [receiptResult] = await conn.execute(`
      INSERT INTO receipts
        (order_id, receipt_number, issued_to, issued_by, total_amount, items_snapshot, printed_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      orderId,
      receiptNumber,
      customer_name || 'Walk-in Customer',
      req.user.id,
      total,
      itemsSnapshot
    ]);

    await conn.commit();

    res.json({
      message: 'Order created successfully',
      order_id: orderId,
      order_number: orderNumber,
      receipt_id: receiptResult.insertId,
      receipt_number: receiptNumber,
      total
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/pos/orders/:id — single order with items and receipt
router.get('/:id', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT o.*, r.receipt_number, r.id AS receipt_id, r.items_snapshot
      FROM orders o
      LEFT JOIN receipts r ON r.order_id = o.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (orders.length === 0)
      return res.status(404).json({ message: 'Order not found' });

    const order = orders[0];
    const [items] = await db.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );
    order.items = items;

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pos/orders — list walk-in orders (paginated, filterable)
router.get('/', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { from, to, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let where = "WHERE o.type = 'walkin'";
    const params = [];

    if (from) { where += ' AND DATE(o.created_at) >= ?'; params.push(from); }
    if (to)   { where += ' AND DATE(o.created_at) <= ?'; params.push(to); }

    const [rows] = await db.execute(`
      SELECT o.id, o.order_number, o.walkin_customer_name,
             o.walkin_customer_phone, o.total, o.payment_method,
             o.status, o.created_at, r.receipt_number,
             u.name AS processed_by
      FROM orders o
      LEFT JOIN receipts r ON r.order_id = o.id
      LEFT JOIN users u ON u.id = r.issued_by
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [count] = await db.execute(
      `SELECT COUNT(*) AS total FROM orders o ${where}`,
      params
    );

    res.json({
      orders: rows,
      total: count[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
