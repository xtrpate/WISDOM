// controllers/customer/customer.warranty.js
const db = require("../../config/db");

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
    // Updated to use your 'warranties' table and map 'reason' to 'description' for the frontend
    const [rows] = await db.execute(
      `SELECT id, order_id, product_name, reason AS description,
              proof_url, status, created_at
       FROM warranties
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
  const { order_id, product_name, description } = req.body;

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

  // Since your database only has a single 'proof_url' column,
  // we combine both uploaded images into a comma-separated string.
  const combinedUrls = [photo_url, proof_url].filter(Boolean).join(",") || null;

  try {
    // Updated to match your exact phpMyAdmin schema
    const [result] = await db.execute(
      `INSERT INTO warranties
         (customer_id, order_id, product_name, reason, proof_url, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        order_id || null,
        product_name.trim(),
        description.trim(), // This maps the frontend description to your 'reason' column
        combinedUrls,
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
