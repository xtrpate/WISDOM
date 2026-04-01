// controllers/customer/customer.orders.js
const db = require("../../config/db"); // Uses the unified db config

/* ── Get Settings (Payment Info) ── */
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN ('gcash_number','bank_account_name','bank_account_number')`,
    );
    const out = {};
    rows.forEach((r) => {
      out[r.setting_key] = r.setting_value;
    });
    res.json(out);
  } catch (err) {
    res.json({}); // silently return empty — non-critical
  }
};

/* ── Place a New Order ── */
exports.createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      items: itemsRaw,
      name,
      phone,
      delivery_address,
      payment_method,
      notes,
      subtotal,
      total,
    } = req.body;

    const items = JSON.parse(itemsRaw);
    if (!items?.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Cart is empty." });
    }

    if (!name || !phone || !payment_method) {
      await conn.rollback();
      return res.status(400).json({ message: "Missing required fields." });
    }

    /* Generate order number: SWS-YYYYMMDD-XXXX */
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const order_number = `SWS-${dateStr}-${rand}`;

    /* Payment status logic */
    const payment_status = ["cod", "cop"].includes(payment_method)
      ? "unpaid"
      : "partial";

    const proof_path = req.file ? `uploads/proofs/${req.file.filename}` : null;

    /* Insert order */
    const [orderRes] = await conn.execute(
      `INSERT INTO orders
        (order_number, customer_id, type, status,
         payment_method, payment_status, payment_proof,
         delivery_address, walkin_customer_name, walkin_customer_phone,
         notes, subtotal, total, created_at)
       VALUES (?,?,'online','pending',?,?,?,?,?,?,?,?,?,NOW())`,
      [
        order_number,
        req.user.id,
        payment_method,
        payment_status,
        proof_path,
        delivery_address || "",
        name,
        phone,
        notes || "",
        parseFloat(subtotal),
        parseFloat(total),
      ],
    );

    const order_id = orderRes.insertId;

    /* Insert order items + deduct stock */
    for (const item of items) {
      const unit_price = parseFloat(item.unit_price);

      await conn.execute(
        `INSERT INTO order_items
          (order_id, product_id, variation_id,
           product_name, quantity, unit_price, subtotal)
         VALUES (?,?,?,?,?,?,?)`,
        [
          order_id,
          item.product_id,
          item.variation_id || null,
          item.product_name,
          item.quantity,
          unit_price,
          unit_price * item.quantity,
        ],
      );

      /* Deduct stock */
      if (item.variation_id) {
        await conn.execute(
          `UPDATE product_variations
           SET stock = GREATEST(0, stock - ?)
           WHERE id = ?`,
          [item.quantity, item.variation_id],
        );
      } else {
        await conn.execute(
          `UPDATE products
           SET stock = GREATEST(0, stock - ?)
           WHERE id = ?`,
          [item.quantity, item.product_id],
        );
      }

      /* Update stock_status after deduction */
      await conn.execute(
        `UPDATE products
         SET stock_status = CASE
           WHEN stock <= 0              THEN 'out_of_stock'
           WHEN stock <= reorder_point  THEN 'low_stock'
           ELSE 'in_stock'
         END
         WHERE id = ?`,
        [item.product_id],
      );
    }

    await conn.commit();

    res.status(201).json({
      message: "Order placed successfully.",
      order_id,
      order_number,
      total: parseFloat(total),
      payment_status,
    });
  } catch (err) {
    await conn.rollback();
    console.error("[customer.orders POST]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  } finally {
    conn.release();
  }
};

/* ── List My Orders ── */
exports.getOrders = async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT id, order_number, status, payment_method,
              payment_status, subtotal, total,
              delivery_address, walkin_customer_name AS recipient_name,
              notes, created_at
       FROM orders
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    for (const order of orders) {
      const [items] = await db.execute(
        `SELECT COUNT(*) AS cnt, SUM(quantity) AS qty
         FROM order_items WHERE order_id = ?`,
        [order.id],
      );
      order.item_count = items[0].cnt;
      order.total_qty = items[0].qty;
    }

    res.json(orders);
  } catch (err) {
    console.error("[customer.orders GET]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── Single Order Detail ── */
exports.getOrderById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM orders
       WHERE id = ? AND customer_id = ?`,
      [req.params.id, req.user.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Order not found." });

    const order = rows[0];
    const [items] = await db.execute(
      `SELECT oi.*, p.image_url
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [order.id],
    );
    order.items = items;

    res.json(order);
  } catch (err) {
    console.error("[customer.orders/:id]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── Customer Confirms Delivery ── */
exports.confirmOrder = async (req, res) => {
  try {
    const [result] = await db.execute(
      `UPDATE orders
       SET status = 'completed'
       WHERE id = ? AND customer_id = ? AND status = 'delivered'`,
      [req.params.id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message:
          "Order could not be confirmed. It may not exist or is not in 'delivered' status.",
      });
    }

    res.json({ message: "Order confirmed successfully." });
  } catch (err) {
    console.error("[customer.orders/:id/confirm]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};
