const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');

// ─── GET /api/pos/products/all ─────────────────────────────────
// IMPORTANT: /all MUST be defined BEFORE / to prevent Express from
// matching '/' first and treating 'all' as a query parameter.
// All products for inventory view (read-only, no stock filter)
router.get('/all', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.id, p.barcode, p.name, p.walkin_price, p.stock,
             p.stock_status, p.reorder_point, p.type, c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.stock_status ASC, p.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/pos/products ─────────────────────────────────────
// Search by name or barcode for POS cart.
// Shows ALL products (including out-of-stock) so staff can inform
// customers — the Add to Cart button is disabled for out-of-stock.
// production_cost is included so order_items.profit_margin is correct.
router.get('/', authenticate, requireStaffOrAdmin, async (req, res) => {
  const { q, barcode } = req.query;
  try {
    let query = `
      SELECT p.id, p.barcode, p.name, p.description, p.image_url,
             p.walkin_price, p.online_price, p.production_cost,
             p.stock, p.stock_status, p.type, c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const params = [];

    if (barcode) {
      query += ' AND p.barcode = ?';
      params.push(barcode);
    } else if (q) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    } else {
      // No query provided — return empty to avoid loading entire catalogue
      return res.json([]);
    }

    query += ' ORDER BY p.name LIMIT 50';

    const [rows] = await db.execute(query, params);

    // Fetch variations for each product (include unit_cost for profit tracking)
    for (const product of rows) {
      const [vars] = await db.execute(
        `SELECT id, variation_type, variation_value, variation_name,
                selling_price, unit_cost, stock
         FROM product_variations WHERE product_id = ?`,
        [product.id]
      );
      product.variations = vars;
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
