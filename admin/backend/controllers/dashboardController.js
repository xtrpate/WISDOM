// controllers/dashboardController.js
// Supports: ?preset=today|week|month|year  OR  ?from=YYYY-MM-DD&to=YYYY-MM-DD
const pool = require('../config/db');

function getDateRange(preset, from, to) {
  const today = new Date();
  const pad   = n => String(n).padStart(2, '0');
  const fmt   = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  if (preset === 'today') {
    const t = fmt(today);
    return { from: t, to: t };
  }
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    const t = fmt(y);
    return { from: t, to: t };
  }
  if (preset === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { from: fmt(start), to: fmt(today) };
  }
  if (preset === 'last7') {
    const start = new Date(today); start.setDate(today.getDate() - 6);
    return { from: fmt(start), to: fmt(today) };
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(start), to: fmt(today) };
  }
  if (preset === 'last30') {
    const start = new Date(today); start.setDate(today.getDate() - 29);
    return { from: fmt(start), to: fmt(today) };
  }
  if (preset === 'year') {
    const start = new Date(today.getFullYear(), 0, 1);
    return { from: fmt(start), to: fmt(today) };
  }
  if (preset === 'last12m') {
    const start = new Date(today); start.setMonth(today.getMonth() - 11); start.setDate(1);
    return { from: fmt(start), to: fmt(today) };
  }
  // Custom range
  if (from && to) return { from, to };
  // Default: last 30 days
  const start = new Date(today); start.setDate(today.getDate() - 29);
  return { from: fmt(start), to: fmt(today) };
}

exports.getDashboard = async (req, res) => {
  try {
    const { preset, from: rawFrom, to: rawTo } = req.query;
    const { from, to } = getDateRange(preset, rawFrom, rawTo);

    const dateFilter     = 'AND DATE(created_at) BETWEEN ? AND ?';
    const dateParams     = [from, to];
    const orderFilter    = 'AND DATE(o.created_at) BETWEEN ? AND ?';

    // ── Inventory KPIs (always all-time) ────────────────────────────────────
    const [[invStats]] = await pool.query(`
      SELECT COUNT(*) AS total_products,
             SUM(stock_status = 'low_stock')    AS low_stock_count,
             SUM(stock_status = 'out_of_stock') AS out_of_stock_count
      FROM products WHERE 1=1
    `);

    const [[rawStats]] = await pool.query(`
      SELECT COUNT(*) AS total_raw_materials,
             SUM(stock_status = 'low_stock')    AS raw_low_stock,
             SUM(stock_status = 'out_of_stock') AS raw_out_of_stock
      FROM raw_materials WHERE 1=1
    `);

    // ── Order Fulfillment ────────────────────────────────────────────────────
    const [[orderStats]] = await pool.query(`
      SELECT COUNT(*)                    AS total_orders,
             SUM(status = 'completed')  AS completed_orders,
             SUM(status = 'pending')    AS pending_orders,
             SUM(status = 'production') AS processing_orders,
             SUM(status = 'shipping')   AS shipped_orders,
             SUM(status = 'cancelled')  AS cancelled_orders
      FROM orders WHERE 1=1 ${dateFilter}
    `, dateParams);

    // ── Sales Performance ────────────────────────────────────────────────────
    const [[salesStats]] = await pool.query(`
      SELECT COALESCE(SUM(o.total), 0)              AS total_revenue,
             COALESCE(SUM(oi.profit_margin * oi.quantity), 0) AS total_profit,
             COALESCE(AVG(o.total), 0)              AS avg_order_value,
             SUM(o.type = 'online')                 AS online_orders,
             SUM(o.type = 'walkin')                 AS walkin_orders
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'cancelled' ${orderFilter}
    `, dateParams);

    // ── Sales Chart ──────────────────────────────────────────────────────────
    const [salesChart] = await pool.query(`
      SELECT DATE(created_at) AS date,
             SUM(CASE WHEN type = 'online' THEN total ELSE 0 END) AS online_sales,
             SUM(CASE WHEN type = 'walkin' THEN total ELSE 0 END) AS walkin_sales
      FROM orders
      WHERE status != 'cancelled'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [from, to]);

    // ── Top Products ─────────────────────────────────────────────────────────
    const [topProducts] = await pool.query(`
      SELECT oi.product_id, oi.product_name,
             SUM(oi.quantity) AS units_sold,
             SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled' ${orderFilter}
      GROUP BY oi.product_id, oi.product_name
      ORDER BY units_sold DESC
      LIMIT 10
    `, dateParams);

    // ── Recent Orders ────────────────────────────────────────────────────────
    const [recentOrders] = await pool.query(`
      SELECT o.id,
             COALESCE(u.name, o.walkin_customer_name, 'Walk-in') AS customer_name,
             o.total AS total_amount, o.status,
             o.type AS channel, o.created_at
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE DATE(o.created_at) BETWEEN ? AND ?
      ORDER BY o.created_at DESC
      LIMIT 15
    `, dateParams);

    res.json({
      inventory:    { ...invStats, ...rawStats },
      orders:       orderStats,
      sales:        salesStats,
      salesChart,
      topProducts,
      recentOrders,
      dateRange:    { from, to, preset: preset || 'custom' },
    });
  } catch (err) {
    console.error('[Dashboard]', err.message);
    res.status(500).json({ message: err.message });
  }
};
