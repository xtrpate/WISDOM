const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireStaffOrAdmin } = require('../middleware/auth');

// GET /api/pos/dashboard  (mounted at /api/pos/dashboard → this handles GET /)
router.get('/', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    // Today's sales & order count (walkin only)
    const [salesToday] = await db.execute(`
      SELECT 
        COUNT(*) AS order_count,
        COALESCE(SUM(total), 0) AS total_sales
      FROM orders
      WHERE type = 'walkin'
        AND DATE(created_at) = CURDATE()
        AND status NOT IN ('cancelled')
    `);

    // This week's sales
    const [salesWeek] = await db.execute(`
      SELECT COALESCE(SUM(total), 0) AS weekly_sales
      FROM orders
      WHERE type = 'walkin'
        AND YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1)
        AND status NOT IN ('cancelled')
    `);

    // This month's sales
    const [salesMonth] = await db.execute(`
      SELECT COALESCE(SUM(total), 0) AS monthly_sales
      FROM orders
      WHERE type = 'walkin'
        AND MONTH(created_at) = MONTH(NOW())
        AND YEAR(created_at) = YEAR(NOW())
        AND status NOT IN ('cancelled')
    `);

    // Recent orders today
    const [recentOrders] = await db.execute(`
      SELECT o.id, o.order_number, o.walkin_customer_name, o.total,
             o.payment_method, o.status, o.created_at
      FROM orders o
      WHERE o.type = 'walkin' AND DATE(o.created_at) = CURDATE()
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Top 5 products today
    const [topProducts] = await db.execute(`
      SELECT oi.product_name, SUM(oi.quantity) AS qty_sold,
             SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.type = 'walkin' AND DATE(o.created_at) = CURDATE()
        AND o.status NOT IN ('cancelled')
      GROUP BY oi.product_name
      ORDER BY qty_sold DESC
      LIMIT 5
    `);

    // Low stock alerts — ALL low/out products (not just featured)
    const [lowStock] = await db.execute(`
      SELECT id, name, stock, reorder_point, stock_status
      FROM products
      WHERE stock_status IN ('low_stock','out_of_stock')
      ORDER BY stock_status DESC, stock ASC
      LIMIT 8
    `);

    res.json({
      today: salesToday[0],
      weekly_sales: salesWeek[0].weekly_sales,
      monthly_sales: salesMonth[0].monthly_sales,
      recent_orders: recentOrders,
      top_products: topProducts,
      low_stock_alerts: lowStock
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
