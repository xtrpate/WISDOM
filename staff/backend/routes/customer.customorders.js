/**
 * routes/customer.customorders.js
 * POST /api/customer/custom-orders  — submit a custom order
 * GET  /api/customer/custom-orders  — list customer's custom orders
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

/* POST /api/customer/custom-orders */
router.post("/", authenticate, requireCustomer, async (req, res) => {
  const { items, name, phone, delivery_address, payment_method, notes } =
    req.body;

  if (!items?.length)
    return res.status(400).json({ message: "No items in order." });
  if (!name?.trim())
    return res.status(400).json({ message: "Name is required." });
  if (!phone?.trim())
    return res.status(400).json({ message: "Phone is required." });
  if (!payment_method)
    return res.status(400).json({ message: "Payment method is required." });

  try {
    /* Generate order number */
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const [last] = await db.execute(
      `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`,
      [`SWS-${date}-%`],
    );
    const seq = last.length
      ? String(parseInt(last[0].order_number.split("-")[2]) + 1).padStart(
          4,
          "0",
        )
      : "0001";
    const order_number = `SWS-${date}-${seq}`;

    /* Insert order */
    const [result] = await db.execute(
      `INSERT INTO orders
         (order_number, customer_id, type, order_type, status,
          walkin_customer_name, walkin_customer_phone,
          payment_method, payment_status,
          delivery_address, notes, subtotal, total)
       VALUES (?, ?, 'online', 'blueprint', 'pending', ?, ?, ?, 'unpaid', ?, ?, 0, 0)`,
      [
        order_number,
        req.user.id,
        name,
        phone,
        payment_method,
        delivery_address || null,
        notes || null,
      ],
    );
    const order_id = result.insertId;

    /* Insert items with customization specs */
    for (const item of items) {
      const specs = JSON.stringify({
        wood_type: item.wood_type || null,
        color: item.color || null,
        door_style: item.door_style || null,
        hardware: item.hardware || null,
        width: item.width || null,
        height: item.height || null,
        depth: item.depth || null,
        comments: item.comments || null,
      });
      await db.execute(
        `INSERT INTO order_items
           (order_id, product_id, product_name, quantity, unit_price, subtotal, variation_id)
         VALUES (?, ?, ?, ?, 0, 0, NULL)`,
        [
          order_id,
          item.product_id || null,
          item.product_name,
          item.quantity || 1,
        ],
      );
    }

    res.status(201).json({
      message: "Custom order submitted successfully.",
      order_id,
      order_number,
    });
  } catch (err) {
    console.error("[customer.customorders POST]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

/* GET /api/customer/custom-orders */
router.get("/", authenticate, requireCustomer, async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT id, order_number, status, payment_method, payment_status,
              total, created_at
       FROM orders
       WHERE customer_id = ? AND order_type = 'blueprint'
       ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(orders);
  } catch (err) {
    console.error("[customer.customorders GET]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

module.exports = router;
