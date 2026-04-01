// controllers/customer/customer.warranty.js
const db = require("../../config/db"); // Uses the unified db config

/* ── Get Completed Orders (For Dropdown) ── */
exports.getEligibleOrders = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, order_number, created_at
       FROM orders
       WHERE customer_id = ? AND status = 'completed'
       ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("[customer.warranty orders]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── List My Warranty Claims ── */
exports.getClaims = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, order_number, product_name, description,
              photo_url, proof_url, status, admin_notes, created_at
       FROM warranty_claims
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("[customer.warranty GET]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── Submit a Warranty Claim ── */
exports.submitClaim = async (req, res) => {
  const { order_id, order_number, product_name, description } = req.body;

  if (!product_name?.trim() || !description?.trim()) {
    return res.status(400).json({
      message: "Product name and description of the issue are required.",
    });
  }

  const photo_url = req.files?.photo?.[0]
    ? `uploads/warranty/${req.files.photo[0].filename}`
    : null;
  const proof_url = req.files?.proof?.[0]
    ? `uploads/warranty/${req.files.proof[0].filename}`
    : null;

  try {
    const [result] = await db.execute(
      `INSERT INTO warranty_claims
         (customer_id, order_id, order_number, product_name,
          description, photo_url, proof_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        order_id || null,
        order_number?.trim() || null,
        product_name.trim(),
        description.trim(),
        photo_url,
        proof_url,
      ],
    );

    res.status(201).json({
      message: "Warranty claim submitted successfully.",
      claim_id: result.insertId,
    });
  } catch (err) {
    console.error("[customer.warranty POST]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};
