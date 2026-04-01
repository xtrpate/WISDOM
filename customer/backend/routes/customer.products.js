/**
 * routes/customer.products.js
 * GET /api/customer/products
 *
 * Public-facing product catalog for approved customers.
 * Supports: search, category, type, stock_status, price range, sort
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

/* ── Customer-only gate ── */
const requireCustomer = (req, res, next) => {
  if (req.user.role !== "customer")
    return res.status(403).json({ message: "Customer access only." });
  next();
};

/* ════════════════════════════════════════════════════
   GET /api/customer/products
   Query params:
     q            — search by name / barcode
     category_id  — filter by category
     type         — 'standard' | 'blueprint'
     stock_status — 'in_stock' | 'low_stock' | 'out_of_stock'
     price_min    — minimum online_price
     price_max    — maximum online_price
     sort         — name_asc | name_desc | price_asc | price_desc | newest
     page         — pagination (default 1)
     limit        — per page (default 24)
════════════════════════════════════════════════════ */
router.get("/", authenticate, requireCustomer, async (req, res) => {
  const {
    q,
    category_id,
    type,
    stock_status,
    price_min,
    price_max,
    sort = "name_asc",
    page = 1,
    limit = 24,
  } = req.query;

  try {
    /* ── Build WHERE clause ── */
    let where = "WHERE 1=1";
    const params = [];

    if (q) {
      where +=
        " AND (p.name LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (category_id) {
      where += " AND p.category_id = ?";
      params.push(parseInt(category_id));
    }
    if (type) {
      where += " AND p.type = ?";
      params.push(type);
    }
    if (stock_status) {
      where += " AND p.stock_status = ?";
      params.push(stock_status);
    }
    if (price_min) {
      where += " AND p.online_price >= ?";
      params.push(parseFloat(price_min));
    }
    if (price_max) {
      where += " AND p.online_price <= ?";
      params.push(parseFloat(price_max));
    }

    /* ── Sort ── */
    const sortMap = {
      name_asc: "p.name ASC",
      name_desc: "p.name DESC",
      price_asc: "p.online_price ASC",
      price_desc: "p.online_price DESC",
      newest: "p.created_at DESC",
    };
    const orderBy = sortMap[sort] || "p.name ASC";

    /* ── Pagination ── */
    const offset = (parseInt(page) - 1) * parseInt(limit);

    /* ── Products query ── */
    const [products] = await db.execute(
      `
      SELECT
        p.id, p.barcode, p.name, p.description,
        p.category_id, p.type, p.image_url,
        p.is_featured, p.online_price, p.production_cost,
        p.stock, p.stock_status, p.reorder_point,
        c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
      [...params, parseInt(limit), offset],
    );

    /* ── Attach variations ── */
    for (const product of products) {
      const [vars] = await db.execute(
        `SELECT id, variation_type, variation_value, variation_name,
                selling_price, unit_cost, stock
         FROM product_variations WHERE product_id = ?`,
        [product.id],
      );
      product.variations = vars;
    }

    /* ── Total count ── */
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM products p ${where}`,
      params,
    );

    /* ── Categories for sidebar ── */
    const [categories] = await db.execute(
      `SELECT id, name FROM categories ORDER BY name`,
    );

    res.json({
      products,
      categories,
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("[customer.products]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ════════════════════════════════════════════════════
   GET /api/customer/products/:id  — single product detail
════════════════════════════════════════════════════ */
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT
        p.*, c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `,
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Product not found." });

    const product = rows[0];

    const [vars] = await db.execute(
      `SELECT id, variation_type, variation_value, variation_name,
              selling_price, unit_cost, stock
       FROM product_variations WHERE product_id = ?`,
      [product.id],
    );
    product.variations = vars;

    res.json(product);
  } catch (err) {
    console.error("[customer.products/:id]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
