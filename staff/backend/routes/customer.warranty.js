/**
 * routes/customer.warranty.js
 *
 * POST /api/customer/warranty          — file a claim (multipart: photo + proof)
 * GET  /api/customer/warranty          — list own claims
 * GET  /api/customer/warranty/orders   — fetch completed orders for dropdown
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate } = require("../middleware/auth");

const requireCustomer = (req, res, next) => {
  if (req.user.role !== "customer")
    return res.status(403).json({ message: "Customer access only." });
  next();
};

/* ── Multer storage ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/warranty");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `warranty_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error("Only images (JPEG/PNG/WEBP) and PDF allowed."));
  },
});

/* ── GET /api/customer/warranty/orders ── */
router.get("/orders", authenticate, requireCustomer, async (req, res) => {
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
});

/* ── GET /api/customer/warranty ── */
router.get("/", authenticate, requireCustomer, async (req, res) => {
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
});

/* ── POST /api/customer/warranty ── */
router.post(
  "/",
  authenticate,
  requireCustomer,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "proof", maxCount: 1 },
  ]),
  async (req, res) => {
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
  },
);

module.exports = router;
