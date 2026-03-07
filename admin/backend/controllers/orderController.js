// controllers/orderController.js – Order Management (Admin) [SCHEMA-CORRECTED]
const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { status, channel, search, from, to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where  = ['1=1']; const params = [];

    if (status)     { where.push('o.status = ?');   params.push(status); }
    if (channel)    { where.push('o.type = ?');      params.push(channel); }
    if (from && to) { where.push('DATE(o.created_at) BETWEEN ? AND ?'); params.push(from, to); }
    if (search)     {
      where.push('(COALESCE(u.name, o.walkin_customer_name) LIKE ? OR o.id = ? OR o.order_number LIKE ?)');
      params.push(`%${search}%`, parseInt(search) || 0, `%${search}%`);
    }

    const [orders] = await pool.query(
      `SELECT o.id, o.order_number, o.type AS channel, o.status,
              o.total AS total_amount, o.payment_method, o.payment_status, o.created_at,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
              COALESCE(u.name,  o.walkin_customer_name)  AS customer_name,
              COALESCE(u.email, '')                       AS customer_email,
              COALESCE(u.phone, o.walkin_customer_phone)  AS customer_phone
       FROM orders o LEFT JOIN users u ON u.id = o.customer_id
       WHERE ${where.join(' AND ')}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders o LEFT JOIN users u ON u.id = o.customer_id
       WHERE ${where.join(' AND ')}`, params
    );

    res.json({ orders, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const [[order]] = await pool.query(
      `SELECT o.*, o.type AS channel, o.total AS total_amount,
              COALESCE(u.name,  o.walkin_customer_name)  AS customer_name,
              COALESCE(u.email, '')                       AS customer_email,
              COALESCE(u.phone, o.walkin_customer_phone)  AS customer_phone,
              COALESCE(u.address, o.delivery_address)     AS customer_address
       FROM orders o LEFT JOIN users u ON u.id = o.customer_id WHERE o.id = ?`, [req.params.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const [items]      = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const [payments]   = await pool.query(
      `SELECT pt.*, u.name AS verified_by FROM payment_transactions pt
       LEFT JOIN users u ON u.id = pt.verified_by WHERE pt.order_id = ?`, [req.params.id]
    );
    const [[delivery]] = await pool.query('SELECT * FROM deliveries WHERE order_id = ? LIMIT 1', [req.params.id]);
    const [[contract]] = await pool.query('SELECT * FROM contracts  WHERE order_id = ? LIMIT 1', [req.params.id]);

    res.json({ ...order, items, payments, delivery, contract });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','production','shipping','delivered','completed','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Order status updated to "${status}".` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.accept = async (req, res) => {
  try {
    await pool.query("UPDATE orders SET status = 'confirmed' WHERE id = ? AND status = 'pending'", [req.params.id]);
    res.json({ message: 'Order accepted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.decline = async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      "UPDATE orders SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW() WHERE id = ? AND status = 'pending'",
      [reason || '', req.params.id]
    );
    res.json({ message: 'Order declined.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { payment_id, action } = req.body;
    await pool.query(
      'UPDATE payment_transactions SET status = ?, verified_by = ?, verified_at = NOW() WHERE id = ? AND order_id = ?',
      [action, req.user.id, payment_id, req.params.id]
    );
    if (action === 'verified') {
      await pool.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [req.params.id]);
    }
    res.json({ message: `Payment ${action}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.uploadDeliveryReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const url = `/uploads/deliveries/${req.file.filename}`;
    await pool.query(
      'UPDATE deliveries SET signed_receipt = ?, status = "delivered", delivered_date = NOW() WHERE order_id = ?',
      [url, req.params.id]
    );
    await pool.query("UPDATE orders SET status = 'completed' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Delivery receipt uploaded. Order completed.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getCancellations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, o.total AS total_amount, o.type AS channel,
              COALESCE(u.name, o.walkin_customer_name) AS requested_by_name,
              a.name AS approved_by_name
       FROM cancellations c
       JOIN orders o ON o.id = c.order_id
       LEFT JOIN users u ON u.id = c.requested_by
       LEFT JOIN users a ON a.id = c.approved_by
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.processCancellation = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { approved, refund_amount, policy_applied } = req.body;
    await conn.query(
      'UPDATE cancellations SET approved_by = ?, approved_at = NOW(), refund_amount = ?, policy_applied = ? WHERE order_id = ?',
      [req.user.id, refund_amount, policy_applied, req.params.id]
    );
    if (approved) {
      await conn.query(
        "UPDATE orders SET status = 'cancelled', refund_amount = ?, refund_status = 'pending', cancelled_at = NOW() WHERE id = ?",
        [refund_amount, req.params.id]
      );
    }
    await conn.commit();
    res.json({ message: 'Cancellation processed.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally { conn.release(); }
};
