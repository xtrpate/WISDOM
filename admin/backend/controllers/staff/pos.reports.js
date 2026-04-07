// controllers/staff/pos.reports.js
const db = require("../../config/db"); // Uses the unified db config

/* ── Get POS Sales Reports ── */
exports.getReports = async (req, res) => {
  try {
    const { period = "daily", from, to } = req.query;

    // 👉 FIX: Removed "AND o.type = 'walkin'".
    // Now ALL non-cancelled orders (Online, Blueprint, and POS) will display!
    let whereClause = "WHERE o.status != 'cancelled'";
    let queryParams = [];

    // Apply Custom Date Range Filters
    if (from && to) {
      whereClause += " AND DATE(o.created_at) BETWEEN ? AND ?";
      queryParams.push(from, to);
    }

    // 1. Fetch Top-Level KPIs (Totals)
    const [[totals]] = await db.execute(
      `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total), 0) as grand_total,
        COALESCE(SUM(o.discount), 0) as total_discount,
        COALESCE(SUM(o.total_profit), 0) as estimated_profit
      FROM orders o
      ${whereClause}
      `,
      queryParams,
    );

    // 2. Fetch Sales Trend (Summary Chart)
    let groupByFormat = "%Y-%m-%d"; // Default to daily
    if (period === "weekly")
      groupByFormat = "%Y%v"; // Year + Week number
    else if (period === "monthly") groupByFormat = "%Y-%m";
    else if (period === "yearly") groupByFormat = "%Y";

    const [summaryRows] = await db.execute(
      `
      SELECT 
        DATE_FORMAT(o.created_at, '${groupByFormat}') as period_label,
        COALESCE(SUM(o.total), 0) as total_sales,
        COUNT(*) as order_count
      FROM orders o
      ${whereClause}
      GROUP BY period_label
      ORDER BY period_label ASC
      `,
      queryParams,
    );

    // 3. Fetch Payment Methods Breakdown (Pie Chart)
    const [paymentRows] = await db.execute(
      `
      SELECT 
        o.payment_method,
        COUNT(*) as count,
        COALESCE(SUM(o.total), 0) as total_amount
      FROM orders o
      ${whereClause}
      GROUP BY o.payment_method
      `,
      queryParams,
    );

    // 4. Fetch Top Selling Products
    const [productRows] = await db.execute(
      `
      SELECT 
        oi.product_name,
        SUM(oi.quantity) as qty,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      ${whereClause}
      GROUP BY oi.product_name
      ORDER BY qty DESC
      LIMIT 5
      `,
      queryParams,
    );

    // 5. Fetch Full Transaction History (Table)
    const [transactionRows] = await db.execute(
      `
      SELECT 
        o.id as order_id, 
        o.created_at, 
        o.order_number, 
        r.receipt_number, 
        COALESCE(c.name, o.walkin_customer_name, 'Walk-in Customer') AS customer_name, 
        COALESCE(c.phone, o.walkin_customer_phone) AS customer_phone, 
        o.payment_method, 
        o.subtotal, 
        o.discount, 
        o.total, 
        o.cash_received, 
        o.change_amount, 
        o.total_profit AS estimated_profit, 
        o.delivery_status, 
        o.status AS appointment_status,
        s.name AS processed_by
      FROM orders o
      LEFT JOIN receipts r ON o.id = r.order_id
      LEFT JOIN users c ON o.customer_id = c.id
      LEFT JOIN users s ON o.processed_by = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT 100
      `,
      queryParams,
    );

    res.json({
      totals: totals || {
        total_orders: 0,
        grand_total: 0,
        total_discount: 0,
        estimated_profit: 0,
      },
      summary: summaryRows,
      payment_breakdown: paymentRows,
      top_products: productRows,
      transactions: transactionRows,
    });
  } catch (err) {
    console.error("[POS Reports Error]:", err);
    res.status(500).json({ message: "Server error generating reports" });
  }
};
