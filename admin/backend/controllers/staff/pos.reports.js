// controllers/staff/pos.reports.js
const db = require("../../config/db");

exports.getReports = async (req, res) => {
  try {
    const { period = "daily", from, to, source = "all" } = req.query;

    console.log("\n--- 📊 NEW REPORT REQUEST ---");
    console.log("1. Incoming Filters from React:", {
      period,
      from,
      to,
      source,
    });

    // 👉 DIAGNOSTIC FIX: Start with a purely positive WHERE clause
    // We will ONLY filter out completely empty rows, ignoring status for a moment
    let whereClause = "WHERE o.id IS NOT NULL";
    let queryParams = [];

    // Apply Date Filters
    if (from && to) {
      whereClause += " AND DATE(o.created_at) BETWEEN ? AND ?";
      queryParams.push(from, to);
    } else {
      whereClause += " AND DATE(o.created_at) = CURDATE()";
    }

    // Apply the Source Filter
    if (source === "online") {
      whereClause += " AND o.type = 'online'";
    } else if (source === "walk_in") {
      whereClause += " AND o.type = 'walkin'";
    }

    // Now we add the status filter back, but safely handling NULLs
    whereClause += " AND (o.status != 'cancelled' OR o.status IS NULL)";

    console.log("2. SQL Where Clause:", whereClause);
    console.log("   SQL Params:", queryParams);

    // Fetch Totals
    const [totalsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total), 0) as grand_total,
        COALESCE(SUM(o.discount), 0) as total_discount,
        0 as estimated_profit 
      FROM orders o ${whereClause}`,
      queryParams,
    );

    console.log("3. Database Found Totals:", totalsRows[0]);

    // Fetch Summary
    let groupByFormat = "%Y-%m-%d";
    if (period === "weekly") groupByFormat = "%Y%v";
    else if (period === "monthly") groupByFormat = "%Y-%m";
    else if (period === "yearly") groupByFormat = "%Y";

    const [summaryRows] = await db.execute(
      `SELECT DATE_FORMAT(o.created_at, '${groupByFormat}') as period_label, COALESCE(SUM(o.total), 0) as total_sales, COUNT(*) as order_count FROM orders o ${whereClause} GROUP BY period_label ORDER BY period_label ASC`,
      queryParams,
    );

    // Fetch Payment Methods
    const [paymentRows] = await db.execute(
      `SELECT o.payment_method, COUNT(*) as count, COALESCE(SUM(o.total), 0) as total_amount FROM orders o ${whereClause} GROUP BY o.payment_method`,
      queryParams,
    );

    // Fetch Top Products
    const [productRows] = await db.execute(
      `SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.subtotal) as revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id ${whereClause} GROUP BY oi.product_name ORDER BY qty DESC LIMIT 5`,
      queryParams,
    );

    // Fetch Transactions
    const [transactionRows] = await db.execute(
      `SELECT 
        o.id as order_id, 
        o.created_at, 
        o.order_number, 
        r.receipt_number, 
        COALESCE(c.name, o.walkin_customer_name, 'Walk-in Customer') AS customer_name, 
        COALESCE(c.phone, o.walkin_customer_phone, 'No phone') AS customer_phone,
        o.payment_method, 
        o.subtotal, 
        o.discount, 
        o.total, 
        o.type,
        0 AS estimated_profit 
      FROM orders o
      LEFT JOIN receipts r ON o.id = r.order_id 
      LEFT JOIN users c ON o.customer_id = c.id 
      ${whereClause} 
      ORDER BY o.created_at DESC 
      LIMIT 100`,
      queryParams,
    );

    const finalTotals = totalsRows[0] || {
      total_orders: 0,
      grand_total: 0,
      total_discount: 0,
      estimated_profit: 0,
    };

    console.log("4. Sending Data to Frontend Successfully!\n");

    res.json({
      totals: finalTotals,
      summary: summaryRows,
      payment_breakdown: paymentRows,
      top_products: productRows,
      transactions: transactionRows,
    });
  } catch (err) {
    console.error("\n❌ [POS Reports Error]:", err);
    res.status(500).json({ message: "Server error generating reports" });
  }
};
