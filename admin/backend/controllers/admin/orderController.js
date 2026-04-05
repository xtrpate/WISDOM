// controllers/orderController.js – Order Management (Admin) [SCHEMA-CORRECTED]
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
const pool = require("../../config/db");
=======
const pool = require('../config/db');
function normalizeOrderStatus(status = '') {
  const value = String(status || '').trim().toLowerCase();

  if (!value || value === 'null') return '';
  if (value === 'processing') return 'production';
  if (value === 'shipped') return 'shipping';

  return value;
}

function normalizePaymentState(value = '') {
  return String(value || '').trim().toLowerCase();
}

function getVerifiedPaymentTotal(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => normalizePaymentState(row?.status) === 'verified')
    .reduce((sum, row) => sum + Number(row?.amount || 0), 0);
}


function inferStoredPaymentStatus({
  rawPaymentStatus = '',
  paymentMethod = '',
  orderType = '',
  orderTotal = 0,
  payments = [],
}) {
  const normalizedRaw = normalizePaymentState(rawPaymentStatus);
  const normalizedMethod = normalizePaymentState(paymentMethod);
  const normalizedOrderType = normalizePaymentState(orderType);
  const rows = Array.isArray(payments) ? payments : [];

  const verifiedTotal = getVerifiedPaymentTotal(rows);
  const hasPending = rows.some(
    (row) => normalizePaymentState(row?.status) === 'pending'
  );

  const normalizedTotal = Number(orderTotal || 0);
  const isCashLikeMethod = ['cash', 'cod', 'cop'].includes(normalizedMethod);
  const isWalkInOrder =
    normalizedOrderType === 'walkin' || normalizedOrderType === 'walk-in';

  if (normalizedTotal > 0 && verifiedTotal >= normalizedTotal - 0.01) {
    return 'paid';
  }

  if (verifiedTotal > 0) {
    return 'partial';
  }

  if ((isCashLikeMethod || isWalkInOrder) && normalizedRaw === 'paid') {
    return 'paid';
  }

  if (hasPending) {
    return normalizedRaw === 'partial' ? 'partial' : 'unpaid';
  }

  if (normalizedRaw === 'partial') return 'partial';
  return 'unpaid';
}

function inferDisplayPaymentStatus({
  rawPaymentStatus = '',
  storedPaymentStatus = '',
  paymentMethod = '',
  orderType = '',
  orderTotal = 0,
  payments = [],
}) {
  const normalizedRaw = normalizePaymentState(rawPaymentStatus);
  const normalizedStored = normalizePaymentState(storedPaymentStatus);
  const normalizedMethod = normalizePaymentState(paymentMethod);
  const normalizedOrderType = normalizePaymentState(orderType);
  const rows = Array.isArray(payments) ? payments : [];

  const verifiedTotal = getVerifiedPaymentTotal(rows);
  const hasPending = rows.some(
    (row) => normalizePaymentState(row?.status) === 'pending'
  );

  const hasRejected =
    rows.length > 0 &&
    rows.every((row) => normalizePaymentState(row?.status) === 'rejected');

  const normalizedTotal = Number(orderTotal || 0);
  const isCashLikeMethod = ['cash', 'cod', 'cop'].includes(normalizedMethod);
  const isWalkInOrder =
    normalizedOrderType === 'walkin' || normalizedOrderType === 'walk-in';

  if (normalizedTotal > 0 && verifiedTotal >= normalizedTotal - 0.01) {
    return 'paid';
  }

  if (verifiedTotal > 0) return 'partial';
  if (hasPending) return 'pending';
  if (hasRejected) return 'rejected';

  if ((isCashLikeMethod || isWalkInOrder) && normalizedRaw === 'paid') {
    return 'paid';
  }

  return normalizedStored || normalizedRaw || 'unpaid';
}

function isPaymentSettled({
  rawPaymentStatus = '',
  paymentMethod = '',
  orderType = '',
  orderTotal = 0,
  payments = [],
}) {
  return (
    inferStoredPaymentStatus({
      rawPaymentStatus,
      paymentMethod,
      orderType,
      orderTotal,
      payments,
    }) === 'paid'
  );
}

function getPaymentBalance(orderTotal = 0, payments = []) {
  const total = Number(orderTotal || 0);
  const verifiedTotal = getVerifiedPaymentTotal(payments);
  return Math.max(0, Number((total - verifiedTotal).toFixed(2)));
}

function inferOrderStatus({
  rawStatus = '',
  orderType = '',
  hasContract = false,
  delivery = null,
  blueprintTasks = [],
}) {
  const normalizedRawStatus = normalizeOrderStatus(rawStatus);
  const normalizedOrderType = String(orderType || '').toLowerCase();
  const isWalkInOrder =
    normalizedOrderType === 'walkin' || normalizedOrderType === 'walk-in';

  const tasks = Array.isArray(blueprintTasks) ? blueprintTasks : [];
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => normalizeOrderStatus(task?.status) === 'completed'
  ).length;

  const hasIncompleteTasks = tasks.some((task) =>
    ['pending', 'in_progress'].includes(normalizeOrderStatus(task?.status))
  );

  const deliveryStatus = normalizeOrderStatus(delivery?.status);

  // hard-stop statuses
  if (normalizedRawStatus === 'cancelled') return 'cancelled';
  if (normalizedRawStatus === 'completed') return 'completed';

  // delivery with signed receipt should stay delivered
  // unless the actual order status was already updated to completed
  if (deliveryStatus === 'delivered') return 'delivered';

  if (
    delivery?.id ||
    ['scheduled', 'in_transit', 'shipping'].includes(deliveryStatus)
  ) {
    return 'shipping';
  }

  if (totalTasks > 0) {
    if (hasIncompleteTasks) return 'production';

    if (completedTasks === totalTasks) {
      return isWalkInOrder ? 'completed' : 'shipping';
    }

    return 'production';
  }

  if (hasContract) return 'contract_released';

  // fallback raw statuses only when no stronger evidence exists
  if (normalizedRawStatus) {
    return normalizedRawStatus;
  }

  return 'pending';
}
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js

exports.getAll = async (req, res) => {
  try {
    const {
      status,
      channel,
      search,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;
    const offset = (page - 1) * limit;
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    const where = ["1=1"];
    const params = [];

    if (status) {
      where.push("o.status = ?");
      params.push(status);
    }
    if (channel) {
      where.push("o.type = ?");
      params.push(channel);
    }
    if (from && to) {
      where.push("DATE(o.created_at) BETWEEN ? AND ?");
      params.push(from, to);
    }
    if (search) {
      where.push(
        "(COALESCE(u.name, o.walkin_customer_name) LIKE ? OR o.id = ? OR o.order_number LIKE ?)",
      );
=======
    const where = ['1=1'];
    const params = [];

    const inferredStatusSql = `
      CASE
        WHEN LOWER(COALESCE(o.status, '')) = 'cancelled' THEN 'cancelled'
        WHEN LOWER(COALESCE(o.status, '')) = 'completed' THEN 'completed'

        

        WHEN EXISTS (
          SELECT 1
          FROM deliveries d
          WHERE d.order_id = o.id
            AND LOWER(COALESCE(d.status, '')) = 'delivered'
          LIMIT 1
        ) THEN 'delivered'

        WHEN EXISTS (
          SELECT 1
          FROM deliveries d
          WHERE d.order_id = o.id
          LIMIT 1
        ) THEN 'shipping'

        WHEN EXISTS (
          SELECT 1
          FROM project_tasks pt
          WHERE pt.order_id = o.id
          LIMIT 1
        ) THEN
          CASE
            WHEN (
              SELECT COUNT(*)
              FROM project_tasks pt_pending
              WHERE pt_pending.order_id = o.id
                AND LOWER(COALESCE(pt_pending.status, '')) IN ('pending', 'in_progress')
            ) > 0 THEN 'production'

            WHEN (
              SELECT COUNT(*)
              FROM project_tasks pt_completed
              WHERE pt_completed.order_id = o.id
                AND LOWER(COALESCE(pt_completed.status, '')) = 'completed'
            ) = (
              SELECT COUNT(*)
              FROM project_tasks pt_total
              WHERE pt_total.order_id = o.id
            ) THEN
              CASE
                WHEN LOWER(COALESCE(o.type, '')) IN ('walkin', 'walk-in') THEN 'completed'
                ELSE 'shipping'
              END

            ELSE 'production'
          END

        WHEN EXISTS (
          SELECT 1
          FROM contracts c
          WHERE c.order_id = o.id
          LIMIT 1
        ) THEN 'contract_released'

        WHEN LOWER(COALESCE(o.status, '')) = 'processing' THEN 'production'
        WHEN LOWER(COALESCE(o.status, '')) = 'shipped' THEN 'shipping'
        WHEN LOWER(COALESCE(o.status, '')) NOT IN ('', 'null') THEN LOWER(COALESCE(o.status, ''))

        ELSE 'pending'
      END
    `;

    if (status) {
      where.push(`${inferredStatusSql} = ?`);
      params.push(String(status).toLowerCase());
    }

    if (channel) {
      const normalizedChannel = String(channel).toLowerCase();

      if (normalizedChannel === 'walkin') {
        where.push(`LOWER(COALESCE(o.type, '')) IN ('walkin', 'walk-in')`);
      } else {
        where.push(`LOWER(COALESCE(o.type, '')) = ?`);
        params.push(normalizedChannel);
      }
    }

    if (from && to) {
      where.push('DATE(o.created_at) BETWEEN ? AND ?');
      params.push(from, to);
    }

    if (search) {
      where.push('(COALESCE(u.name, o.walkin_customer_name) LIKE ? OR o.id = ? OR o.order_number LIKE ?)');
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
      params.push(`%${search}%`, parseInt(search) || 0, `%${search}%`);
    }

    const [orders] = await pool.query(
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
      `SELECT o.id, o.order_number, o.type AS channel, o.status,
              o.total AS total_amount, o.payment_method, o.payment_status, o.created_at,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
              COALESCE(u.name,  o.walkin_customer_name)  AS customer_name,
              COALESCE(u.email, '')                       AS customer_email,
              COALESCE(u.phone, o.walkin_customer_phone)  AS customer_phone
       FROM orders o LEFT JOIN users u ON u.id = o.customer_id
       WHERE ${where.join(" AND ")}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
=======
      `SELECT
          o.id,
          o.order_number,
          o.type AS channel,
          ${inferredStatusSql} AS status,
          o.status AS raw_status,
          o.total AS total_amount,
          o.payment_method,
          o.payment_status,
          o.created_at,
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
          COALESCE(u.name, o.walkin_customer_name) AS customer_name,
          COALESCE(u.email, '') AS customer_email,
          COALESCE(u.phone, o.walkin_customer_phone) AS customer_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE ${where.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
    );

    const orderIds = orders.map((order) => order.id);
    const paymentsByOrder = new Map();

    if (orderIds.length) {
      const placeholders = orderIds.map(() => '?').join(',');

      const [paymentRows] = await pool.query(
        `SELECT order_id, amount, status
        FROM payment_transactions
        WHERE order_id IN (${placeholders})`,
        orderIds
      );

      paymentRows.forEach((row) => {
        const key = Number(row.order_id);
        if (!paymentsByOrder.has(key)) {
          paymentsByOrder.set(key, []);
        }
        paymentsByOrder.get(key).push(row);
      });
    }

    const normalizedOrders = orders.map((order) => {
      const payments = paymentsByOrder.get(Number(order.id)) || [];

      const storedPaymentStatus = inferStoredPaymentStatus({
        rawPaymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        orderType: order.channel,
        orderTotal: order.total_amount,
        payments,
      });

      const displayPaymentStatus = inferDisplayPaymentStatus({
        rawPaymentStatus: order.payment_status,
        storedPaymentStatus,
        paymentMethod: order.payment_method,
        orderType: order.channel,
        orderTotal: order.total_amount,
        payments,
      });

      return {
        ...order,
        payment_status: storedPaymentStatus,
        payment_status_display: displayPaymentStatus,
      };
    });

    const [[{ total }]] = await pool.query(
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
      `SELECT COUNT(*) AS total FROM orders o LEFT JOIN users u ON u.id = o.customer_id
       WHERE ${where.join(" AND ")}`,
      params,
    );

    res.json({ orders, total });
=======
      `SELECT COUNT(*) AS total
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({ orders: normalizedOrders, total });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [[order]] = await pool.query(
      `SELECT o.*, o.type AS channel, o.total AS total_amount,
              COALESCE(u.name,  o.walkin_customer_name)  AS customer_name,
              COALESCE(u.email, '')                       AS customer_email,
              COALESCE(u.phone, o.walkin_customer_phone)  AS customer_phone,
              COALESCE(u.address, o.delivery_address)     AS customer_address
       FROM orders o LEFT JOIN users u ON u.id = o.customer_id WHERE o.id = ?`,
      [req.params.id],
    );
    if (!order) return res.status(404).json({ message: "Order not found." });

<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [req.params.id],
    );
    const [payments] = await pool.query(
      `SELECT pt.*, u.name AS verified_by FROM payment_transactions pt
       LEFT JOIN users u ON u.id = pt.verified_by WHERE pt.order_id = ?`,
      [req.params.id],
    );
    const [[delivery]] = await pool.query(
      "SELECT * FROM deliveries WHERE order_id = ? LIMIT 1",
      [req.params.id],
    );
    const [[contract]] = await pool.query(
      "SELECT * FROM contracts  WHERE order_id = ? LIMIT 1",
      [req.params.id],
    );

    res.json({ ...order, items, payments, delivery, contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
=======
    const [items]      = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const [payments]   = await pool.query(
      `SELECT pt.*, u.name AS verified_by FROM payment_transactions pt
      LEFT JOIN users u ON u.id = pt.verified_by WHERE pt.order_id = ?`, [req.params.id]
    );
    const storedPaymentStatus = inferStoredPaymentStatus({
      rawPaymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      orderType: order.type || order.channel,
      orderTotal: order.total_amount || order.total,
      payments,
    });

    const displayPaymentStatus = inferDisplayPaymentStatus({
      rawPaymentStatus: order.payment_status,
      storedPaymentStatus,
      paymentMethod: order.payment_method,
      orderType: order.type || order.channel,
      orderTotal: order.total_amount || order.total,
      payments,
    });

    const verifiedPaymentTotal = getVerifiedPaymentTotal(payments);
    const paymentBalance = getPaymentBalance(
      order.total_amount || order.total,
      payments
    );

    

    const [[delivery]] = await pool.query('SELECT * FROM deliveries WHERE order_id = ? LIMIT 1', [req.params.id]);
    const [[contract]] = await pool.query(
      `SELECT *
      FROM contracts
      WHERE order_id = ?
      ORDER BY
        CASE WHEN blueprint_id IS NULL THEN 1 ELSE 0 END,
        id DESC
      LIMIT 1`,
      [req.params.id]
    );

    const [blueprintTasks] = await pool.query(
      `SELECT
          pt.id,
          pt.order_id,
          pt.blueprint_id,
          pt.task_role,
          pt.title,
          pt.description,
          pt.status,
          pt.due_date,
          pt.created_at,
          pt.updated_at,
          assignee.id   AS assigned_to_id,
          assignee.name AS assigned_to_name,
          assigner.id   AS assigned_by_id,
          assigner.name AS assigned_by_name
      FROM project_tasks pt
      LEFT JOIN users assignee ON assignee.id = pt.assigned_to
      LEFT JOIN users assigner ON assigner.id = pt.assigned_by
      WHERE pt.order_id = ?
      ORDER BY
        CASE
          WHEN pt.status IN ('pending', 'in_progress') THEN 0
          ELSE 1
        END,
        pt.created_at DESC,
        pt.id DESC`,
      [req.params.id]
    );

    

    

    const effectiveStatus = inferOrderStatus({
      rawStatus: order.status,
      orderType: order.type || order.channel,
      hasContract: Boolean(contract),
      delivery,
      blueprintTasks,
    });

    res.json({
      ...order,
      status: effectiveStatus,
      raw_status: order.status,
      raw_payment_status: order.payment_status,
      payment_status: storedPaymentStatus,
      payment_status_display: displayPaymentStatus,
      payment_verified_total: verifiedPaymentTotal,
      payment_balance: paymentBalance,
      items,
      payments,
      delivery,
      contract,
      blueprint_tasks: blueprintTasks,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
};

exports.updateStatus = async (req, res) => {
  try {
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    const { status } = req.body;
    const valid = [
      "pending",
      "confirmed",
      "production",
      "shipping",
      "delivered",
      "completed",
      "cancelled",
    ];
    if (!valid.includes(status))
      return res.status(400).json({ message: "Invalid status." });
    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ message: `Order status updated to "${status}".` });
=======
    const nextStatus = String(req.body?.status || '').toLowerCase();
    const valid = [
      'pending',
      'confirmed',
      'contract_released',
      'production',
      'shipping',
      'delivered',
      'completed',
      'cancelled',
    ];

    if (!valid.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const [[order]] = await pool.query(
      `SELECT
          o.id,
          o.status,
          o.type,
          o.order_type,
          o.blueprint_id,
          o.customer_id,
          o.delivery_address,
          o.walkin_customer_name,
          o.walkin_customer_phone,
          o.payment_method,
          o.payment_status,
          o.total,
          COALESCE(u.address, o.delivery_address) AS resolved_delivery_address
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE o.id = ?
      LIMIT 1`,
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const [[contract]] = await pool.query(
      `SELECT id
       FROM contracts
       WHERE order_id = ?
       LIMIT 1`,
      [req.params.id]
    );

    const [[delivery]] = await pool.query(
      `SELECT id, driver_id, scheduled_date, delivered_date, address, status, signed_receipt, notes
      FROM deliveries
      WHERE order_id = ?
      LIMIT 1`,
      [req.params.id]
    );

    const [taskStatuses] = await pool.query(
      `SELECT status
       FROM project_tasks
       WHERE order_id = ?`,
      [req.params.id]
    );

    const currentStatus = inferOrderStatus({
      rawStatus: order.status,
      orderType: order.type,
      hasContract: Boolean(contract),
      delivery,
      blueprintTasks: taskStatuses,
    });

    const orderType = String(order.type || '').toLowerCase();
    const isWalkInOrder = orderType === 'walkin' || orderType === 'walk-in';

    const normalizedOrderKind = String(order.order_type || '').toLowerCase();
    const isBlueprintOrder =
      normalizedOrderKind === 'blueprint' ||
      Boolean(order.blueprint_id) ||
      Boolean(contract);
    const [paymentRows] = await pool.query(
      `SELECT amount, status
      FROM payment_transactions
      WHERE order_id = ?`,
      [req.params.id]
    );

    const verifiedPaymentTotal = getVerifiedPaymentTotal(paymentRows);

    const paymentSettled = isPaymentSettled({
      rawPaymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      orderType: order.type,
      orderTotal: order.total,
      payments: paymentRows,
    });

    const requiredBlueprintDownPayment = Number(order.total || 0) * 0.3;  

    if (nextStatus === 'contract_released') {
      return res.status(400).json({
        message:
          'Use Generate Contract to move a blueprint order into contract released status.',
      });
    }

    if (
      currentStatus === 'confirmed' &&
      isBlueprintOrder &&
      !contract &&
      nextStatus === 'production'
    ) {
      return res.status(400).json({
        message:
          'Generate the contract first before moving this blueprint order into production.',
      });
    }

    if (
      !isWalkInOrder &&
      !isBlueprintOrder &&
      ['shipping', 'delivered'].includes(nextStatus) &&
      !paymentSettled
    ) {
      return res.status(400).json({
        message:
          'Standard product orders must be fully paid before moving to shipping or delivered status.',
      });
    }

    if (
      isBlueprintOrder &&
      nextStatus === 'production' &&
      !paymentSettled &&
      verifiedPaymentTotal < Math.max(0, requiredBlueprintDownPayment - 0.01)
    ) {
      return res.status(400).json({
        message:
          'At least 30% verified down payment or full payment is required before moving this blueprint order into production.',
      });
    }

    const allowedTransitions = isWalkInOrder
      ? {
          pending: ['confirmed', 'cancelled'],
          confirmed: isBlueprintOrder ? ['cancelled'] : ['production', 'cancelled'],
          contract_released: ['production', 'cancelled'],
          production: ['completed', 'cancelled'],
          shipping: ['completed'],
          delivered: ['completed'],
          completed: [],
          cancelled: [],
        }
      : {
          pending: ['confirmed', 'cancelled'],
          confirmed: isBlueprintOrder ? ['cancelled'] : ['production', 'cancelled'],
          contract_released: ['production', 'cancelled'],
          production: ['shipping', 'cancelled'],
          shipping: ['delivered', 'completed'],
          delivered: ['completed'],
          completed: [],
          cancelled: [],
        };

    if (currentStatus === nextStatus) {
      return res.json({ message: `Order status already "${nextStatus}".` });
    }

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid status transition from "${currentStatus}" to "${nextStatus}".`,
      });
    }

    if (['shipping', 'delivered', 'completed'].includes(nextStatus)) {
      const [[taskSummary]] = await pool.query(
        `SELECT
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) AS incomplete_tasks
        FROM project_tasks
        WHERE order_id = ?`,
        [req.params.id]
      );

      const totalTasks = Number(taskSummary?.total_tasks || 0);
      const incompleteTasks = Number(taskSummary?.incomplete_tasks || 0);
      const hasBlueprintTasks = totalTasks > 0;
      const hasIncompleteBlueprintTasks = incompleteTasks > 0;

      if (hasBlueprintTasks && hasIncompleteBlueprintTasks) {
        return res.status(400).json({
          message:
            'Complete all blueprint tasks first before moving this order to shipping, delivered, or completed.',
        });
      }
    }
    
    if (nextStatus === 'completed' && !paymentSettled) {
      return res.status(400).json({
        message: 'Full payment is required before marking this order as completed.',
      });
    }

    if (nextStatus === 'completed' && !isWalkInOrder) {
      const [[delivery]] = await pool.query(
        `SELECT id, signed_receipt, scheduled_date, delivered_date
        FROM deliveries
        WHERE order_id = ?
        LIMIT 1`,
        [req.params.id]
      );

      if (!delivery) {
        return res.status(400).json({
          message:
            'A delivery record is required before marking this order as completed.',
        });
      }

      if (!delivery.scheduled_date) {
        return res.status(400).json({
          message:
            'A scheduled delivery date is required before marking this delivery order as completed.',
        });
      }

      if (!delivery.delivered_date) {
        return res.status(400).json({
          message:
            'A delivered date is required before marking this delivery order as completed.',
        });
      }

      if (!delivery.signed_receipt) {
        return res.status(400).json({
          message:
            'A signed delivery receipt is required before marking this delivery order as completed.',
        });
      }

      if (
        hasInvalidDeliveryDateOrder(
          delivery.scheduled_date,
          delivery.delivered_date
        )
      ) {
        return res.status(400).json({
          message:
            'Delivered date cannot be earlier than the scheduled delivery date.',
        });
      }
    }
    if (nextStatus === 'shipping' && !isWalkInOrder) {
      
      const resolvedDeliveryAddress = String(order.resolved_delivery_address || '').trim();
      
      if (!resolvedDeliveryAddress) {
        return res.status(400).json({
          message: 'A delivery address is required before moving this order to shipping.',
        });
      }

      let driverId = delivery?.driver_id || null;

      if (!driverId) {
        const [[autoDriver]] = await pool.query(
          `SELECT
              u.id
          FROM users u
          WHERE u.role = 'staff'
            AND u.is_active = 1
          ORDER BY
            (
              SELECT COUNT(*)
              FROM deliveries d2
              WHERE d2.driver_id = u.id
                AND DATE(d2.scheduled_date) = CURDATE()
                AND d2.status IN ('scheduled', 'in_transit')
            ) ASC,
            u.name ASC
          LIMIT 1`
        );

        if (!autoDriver) {
          return res.status(400).json({
            message: 'No active staff is available to assign as delivery personnel.',
          });
        }

        driverId = autoDriver.id;
      }

      if (!delivery) {
        await pool.query(
          `INSERT INTO deliveries
            (order_id, driver_id, scheduled_date, address, status, signed_receipt, notes)
          VALUES (?, ?, NOW(), ?, 'scheduled', NULL, ?)`,
          [
            req.params.id,
            driverId,
            resolvedDeliveryAddress,
            'Auto-created when order status moved to shipping.',
          ]
        );
      } else {
        await pool.query(
          `UPDATE deliveries
          SET driver_id = COALESCE(driver_id, ?),
              scheduled_date = COALESCE(scheduled_date, NOW()),
              address = CASE
                WHEN COALESCE(address, '') = '' THEN ?
                ELSE address
              END,
              status = CASE
                WHEN LOWER(COALESCE(status, '')) IN ('', 'failed') THEN 'scheduled'
                WHEN LOWER(COALESCE(status, '')) = 'delivered' AND signed_receipt IS NOT NULL THEN status
                ELSE status
              END,
              notes = CASE
                WHEN COALESCE(notes, '') = '' THEN 'Auto-updated when order status moved to shipping.'
                ELSE notes
              END
          WHERE order_id = ?`,
          [driverId, resolvedDeliveryAddress, req.params.id]
        );
      }
    }

    await pool.query(
      `UPDATE orders
      SET status = ?
      WHERE id = ?`,
      [nextStatus, req.params.id]
    );

    await syncLinkedBlueprintStage(pool, req.params.id, nextStatus);
    res.json({
      message:
        nextStatus === 'shipping' && !isWalkInOrder
          ? 'Order status updated to "shipping" and delivery record synchronized.'
          : `Order status updated to "${nextStatus}".`,
    });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.accept = async (req, res) => {
  try {
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    await pool.query(
      "UPDATE orders SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
      [req.params.id],
    );
    res.json({ message: "Order accepted." });
=======
    const [result] = await pool.query(
      `UPDATE orders
       SET status = 'confirmed'
       WHERE id = ?
         AND LOWER(COALESCE(status, '')) IN ('', 'null', 'pending')`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ message: 'Only pending orders can be accepted.' });
    }

    res.json({ message: 'Order accepted.' });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.decline = async (req, res) => {
  try {
    const { reason } = req.body;
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    await pool.query(
      "UPDATE orders SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW() WHERE id = ? AND status = 'pending'",
      [reason || "", req.params.id],
    );
    res.json({ message: "Order declined." });
=======

    const [result] = await pool.query(
      `UPDATE orders
       SET status = 'cancelled',
           cancellation_reason = ?,
           cancelled_at = NOW()
       WHERE id = ?
         AND LOWER(COALESCE(status, '')) IN ('', 'null', 'pending')`,
      [reason || '', req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ message: 'Only pending orders can be declined.' });
    }

    res.json({ message: 'Order declined.' });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const { payment_id, action } = req.body;
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    await pool.query(
      "UPDATE payment_transactions SET status = ?, verified_by = ?, verified_at = NOW() WHERE id = ? AND order_id = ?",
      [action, req.user.id, payment_id, req.params.id],
    );
    if (action === "verified") {
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = ?",
        [req.params.id],
      );
    }
    res.json({ message: `Payment ${action}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
=======
    const normalizedAction = normalizePaymentState(action);

    if (!payment_id) {
      await conn.rollback();
      return res.status(400).json({ message: 'Payment ID is required.' });
    }

    if (!['verified', 'rejected'].includes(normalizedAction)) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid payment action.' });
    }

    const [[order]] = await conn.query(
      `SELECT id, status, type, order_type, payment_method, payment_status, total
      FROM orders
      WHERE id = ?
      LIMIT 1`,
      [req.params.id]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (normalizeOrderStatus(order.status) === 'cancelled') {
      await conn.rollback();
      return res.status(400).json({
        message: 'Cancelled orders can no longer receive payment review updates.',
      });
    }

    const [[payment]] = await conn.query(
      `SELECT id, status
       FROM payment_transactions
       WHERE id = ?
         AND order_id = ?
       LIMIT 1`,
      [payment_id, req.params.id]
    );

    if (!payment) {
      await conn.rollback();
      return res.status(404).json({ message: 'Payment transaction not found.' });
    }

    const currentPaymentStatus = normalizePaymentState(payment.status);

    if (currentPaymentStatus !== 'pending') {
      await conn.rollback();
      return res.status(400).json({
        message: 'Only pending payment transactions can be reviewed.',
      });
    }

    await conn.query(
      `UPDATE payment_transactions
       SET status = ?,
           verified_by = ?,
           verified_at = NOW()
       WHERE id = ?
         AND order_id = ?`,
      [normalizedAction, req.user.id, payment_id, req.params.id]
    );

    const [allPayments] = await conn.query(
      `SELECT id, amount, status
      FROM payment_transactions
      WHERE order_id = ?`,
      [req.params.id]
    );

    const nextStoredPaymentStatus = inferStoredPaymentStatus({
      rawPaymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      orderType: order.type,
      orderTotal: order.total,
      payments: allPayments,
    });

    const [[deliveryForCompletion]] = await conn.query(
      `SELECT id, status, signed_receipt, delivered_date
      FROM deliveries
      WHERE order_id = ?
      LIMIT 1`,
      [req.params.id]
    );

    const shouldAutoCompleteDeliveredOrder =
      normalizedAction === 'verified' &&
      nextStoredPaymentStatus === 'paid' &&
      normalizeOrderStatus(order.status) === 'delivered' &&
      Boolean(deliveryForCompletion?.id) &&
      normalizeOrderStatus(deliveryForCompletion?.status) === 'delivered' &&
      Boolean(deliveryForCompletion?.signed_receipt) &&
      Boolean(deliveryForCompletion?.delivered_date);

    await conn.query(
      `UPDATE orders
      SET payment_status = ?,
          status = CASE
            WHEN ? = 1 THEN 'completed'
            ELSE status
          END
      WHERE id = ?`,
      [nextStoredPaymentStatus, shouldAutoCompleteDeliveredOrder ? 1 : 0, req.params.id]
    );

    if (shouldAutoCompleteDeliveredOrder) {
      await syncLinkedBlueprintStage(conn, req.params.id, 'completed');
    }

    await conn.commit();

    res.json({
      message: shouldAutoCompleteDeliveredOrder
        ? 'Payment verified. Remaining balance settled and order completed.'
        : `Payment ${normalizedAction}.`,
      payment_status: nextStoredPaymentStatus,
      order_status: shouldAutoCompleteDeliveredOrder ? 'completed' : order.status,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  }
};


function hasInvalidDeliveryDateOrder(scheduledDate, deliveredDate) {
  if (!scheduledDate || !deliveredDate) return false;

  const scheduled = new Date(scheduledDate);
  const delivered = new Date(deliveredDate);

  if (
    Number.isNaN(scheduled.getTime()) ||
    Number.isNaN(delivered.getTime())
  ) {
    return true;
  }

  return delivered.getTime() < scheduled.getTime();
}



function roundCurrency(value) {
  return Math.max(0, Number(Number(value || 0).toFixed(2)));
}

exports.uploadDeliveryReceipt = async (req, res) => {
  try {
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });
    const url = `/uploads/deliveries/${req.file.filename}`;
    await pool.query(
      'UPDATE deliveries SET signed_receipt = ?, status = "delivered", delivered_date = NOW() WHERE order_id = ?',
      [url, req.params.id],
    );
    await pool.query("UPDATE orders SET status = 'completed' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Delivery receipt uploaded. Order completed." });
=======
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const [[order]] = await pool.query(
      `SELECT id, status, type, order_type, blueprint_id, payment_method, payment_status, total
      FROM orders
      WHERE id = ?
      LIMIT 1`,
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const [[delivery]] = await pool.query(
      `SELECT id, status, signed_receipt, scheduled_date
      FROM deliveries
      WHERE order_id = ?
      LIMIT 1`,
      [req.params.id]
    );

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery record not found.' });
    }

    const [paymentRows] = await pool.query(
      `SELECT amount, status
      FROM payment_transactions
      WHERE order_id = ?`,
      [req.params.id]
    );

    const paymentSettled = isPaymentSettled({
      rawPaymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      orderType: order.type,
      orderTotal: order.total,
      payments: paymentRows,
    });

    const normalizedMethod = String(order.payment_method || '').toLowerCase();
    const isCashOnDeliveryLike = ['cod', 'cop'].includes(normalizedMethod);

    const normalizedOrderKind = String(order.order_type || '').toLowerCase();
    const normalizedOrderChannel = String(order.type || '').toLowerCase();

    const isWalkInOrder =
      normalizedOrderChannel === 'walkin' || normalizedOrderChannel === 'walk-in';

    const isBlueprintOrder =
      normalizedOrderKind === 'blueprint' || Boolean(order.blueprint_id);

    if (!isWalkInOrder && !isBlueprintOrder && !paymentSettled) {
      return res.status(400).json({
        message:
          'Standard product orders must be fully paid before delivery can be completed.',
      });
    }

    const currentStatus = inferOrderStatus({
      rawStatus: order.status,
      orderType: order.type,
      hasContract: false,
      delivery,
      blueprintTasks: [],
    });

    if (!['shipping', 'delivered'].includes(currentStatus)) {
      return res.status(400).json({
        message: 'Delivery receipt can only be uploaded when the order is already in shipping or delivered status.',
      });
    }

    if (delivery.signed_receipt) {
      return res.status(400).json({
        message: 'A signed delivery receipt has already been uploaded for this order.',
      });
    }

    if (!delivery.scheduled_date) {
      return res.status(400).json({
        message:
          'A scheduled delivery date is required before uploading a signed delivery receipt.',
      });
    }

    const scheduledAt = new Date(delivery.scheduled_date);

    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({
        message: 'Delivery record has an invalid scheduled delivery date.',
      });
    }

    const deliveredAt = new Date();

    if (hasInvalidDeliveryDateOrder(delivery.scheduled_date, deliveredAt)) {
      return res.status(400).json({
        message:
          'Delivery receipt cannot be uploaded before the scheduled delivery date.',
      });
    }

    const url = `/uploads/deliveries/${req.file.filename}`;

    await pool.query(
      `UPDATE deliveries
      SET signed_receipt = ?,
          status = 'delivered',
          delivered_date = ?
      WHERE order_id = ?`,
      [url, deliveredAt, req.params.id]
    );

    const shouldMarkPaidOnDelivery =
      !isBlueprintOrder && isCashOnDeliveryLike;

    const canAutoCompleteOnDelivery =
      paymentSettled || shouldMarkPaidOnDelivery;

    const nextOrderStatus = canAutoCompleteOnDelivery
      ? 'completed'
      : 'delivered';

    await pool.query(
      `UPDATE orders
      SET status = ?,
          payment_status = CASE
            WHEN ? = 1 THEN 'paid'
            ELSE payment_status
          END
      WHERE id = ?`,
      [nextOrderStatus, shouldMarkPaidOnDelivery ? 1 : 0, req.params.id]
    );

    await syncLinkedBlueprintStage(pool, req.params.id, nextOrderStatus);

    res.json({
      message:
        nextOrderStatus === 'completed'
          ? 'Delivery receipt uploaded. Order completed.'
          : 'Delivery receipt uploaded. Order marked as delivered. Full payment is still required before completion.',
    });

>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function mapOrderStatusToBlueprintStage(orderStatus = '') {
  const normalized = normalizeOrderStatus(orderStatus);

  if (!normalized || normalized === 'cancelled') return null;
  if (normalized === 'contract_released') return 'approval';
  if (normalized === 'production') return 'production';
  if (['shipping', 'delivered'].includes(normalized)) return 'delivery';
  if (normalized === 'completed') return 'completed';

  return null;
}

async function syncLinkedBlueprintStage(db, orderId, orderStatus) {
  const nextBlueprintStage = mapOrderStatusToBlueprintStage(orderStatus);

  if (!nextBlueprintStage) return;

  const [[linked]] = await db.query(
    `SELECT
        COALESCE(
          o.blueprint_id,
          (
            SELECT c.blueprint_id
            FROM contracts c
            WHERE c.order_id = o.id
            ORDER BY
              CASE WHEN c.blueprint_id IS NULL THEN 1 ELSE 0 END,
              c.id DESC
            LIMIT 1
          )
        ) AS blueprint_id
     FROM orders o
     WHERE o.id = ?
     LIMIT 1`,
    [orderId]
  );

  if (!linked?.blueprint_id) return;

  await db.query(
    `UPDATE blueprints
     SET stage = CASE
       WHEN is_deleted = 1 THEN stage
       ELSE ?
     END
     WHERE id = ?`,
    [nextBlueprintStage, linked.blueprint_id]
  );
}

exports.getCancellations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          c.id,
          c.order_id,
          c.requested_by,
          c.reason,
          c.policy_applied,
          c.refund_amount,
          c.approved_by,
          c.approved_at,
          c.created_at,
          o.order_number,
          o.total AS total_amount,
          o.type AS channel,
          o.status AS current_order_status,
          COALESCE(customer.name, o.walkin_customer_name, 'Customer') AS customer_name,
          COALESCE(requester.name, customer.name, o.walkin_customer_name, 'Customer') AS requested_by_name,
          approver.name AS approved_by_name,
          CASE
            WHEN c.approved_by IS NULL THEN 'pending'
            WHEN LOWER(COALESCE(o.status, '')) = 'cancelled' THEN 'approved'
            ELSE 'rejected'
          END AS decision_status
       FROM cancellations c
       JOIN orders o ON o.id = c.order_id
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
       LEFT JOIN users u ON u.id = c.requested_by
       LEFT JOIN users a ON a.id = c.approved_by
       ORDER BY c.created_at DESC`,
=======
       LEFT JOIN users customer  ON customer.id  = o.customer_id
       LEFT JOIN users requester ON requester.id = c.requested_by
       LEFT JOIN users approver  ON approver.id  = c.approved_by
       ORDER BY c.created_at DESC, c.id DESC`
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.processCancellation = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    const { approved, refund_amount, policy_applied } = req.body;
    await conn.query(
      "UPDATE cancellations SET approved_by = ?, approved_at = NOW(), refund_amount = ?, policy_applied = ? WHERE order_id = ?",
      [req.user.id, refund_amount, policy_applied, req.params.id],
    );
    if (approved) {
      await conn.query(
        "UPDATE orders SET status = 'cancelled', refund_amount = ?, refund_status = 'pending', cancelled_at = NOW() WHERE id = ?",
        [refund_amount, req.params.id],
      );
=======

    const approvedInput = req.body?.approved;
    const approved =
      approvedInput === true ||
      approvedInput === 'true' ||
      approvedInput === 1 ||
      approvedInput === '1';

    const normalizedPolicy = String(req.body?.policy_applied || '')
      .trim()
      .toLowerCase();

    const [[existingCancellation]] = await conn.query(
      `SELECT
          c.id,
          c.order_id,
          c.approved_by,
          o.type,
          o.total,
          o.status AS order_status,
          o.created_at,
          o.blueprint_id,
          o.payment_method,
          o.payment_status
      FROM cancellations c
      JOIN orders o ON o.id = c.order_id
      WHERE c.order_id = ?
      LIMIT 1`,
      [req.params.id]
    );

    if (!existingCancellation) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cancellation request not found.' });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
    }

    if (existingCancellation.approved_by !== null) {
      await conn.rollback();
      return res.status(400).json({
        message: 'This cancellation request has already been processed.',
      });
    }

    if (approved) {
      const [[contract]] = await conn.query(
        `SELECT id
         FROM contracts
         WHERE order_id = ?
         LIMIT 1`,
        [req.params.id]
      );

      const [[delivery]] = await conn.query(
        `SELECT id, status, signed_receipt
         FROM deliveries
         WHERE order_id = ?
         LIMIT 1`,
        [req.params.id]
      );

      const [paymentRows] = await conn.query(
        `SELECT amount, status
        FROM payment_transactions
        WHERE order_id = ?`,
        [req.params.id]
      );

      const storedPaymentStatus = inferStoredPaymentStatus({
        rawPaymentStatus: existingCancellation.payment_status,
        paymentMethod: existingCancellation.payment_method,
        orderType: existingCancellation.type,
        orderTotal: existingCancellation.total,
        payments: paymentRows,
      });

      const verifiedPaymentTotal = roundCurrency(
        paymentRows
          .filter(
            (row) => normalizePaymentState(row?.status) === 'verified'
          )
          .reduce((sum, row) => sum + Number(row?.amount || 0), 0)
      );

      const normalizedMethod = String(
        existingCancellation.payment_method || ''
      ).toLowerCase();

      const isCashLikeMethod = ['cash', 'cod', 'cop'].includes(normalizedMethod);

      const collectedAmount =
        storedPaymentStatus === 'paid' &&
        verifiedPaymentTotal <= 0 &&
        isCashLikeMethod
          ? roundCurrency(existingCancellation.total)
          : verifiedPaymentTotal;

      const effectiveStatus = inferOrderStatus({
        rawStatus: existingCancellation.order_status,
        orderType: existingCancellation.type,
        hasContract: Boolean(contract),
        delivery,
        blueprintTasks: [],
      });

      const orderType = String(existingCancellation.type || '').toLowerCase();
      const isWalkInOrder =
        orderType === 'walkin' || orderType === 'walk-in';

      const isBlueprintOrder = Boolean(
        existingCancellation.blueprint_id || contract
      );

      const createdAt = new Date(existingCancellation.created_at);
      const now = new Date();

      const isSameDay =
        !Number.isNaN(createdAt.getTime()) &&
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate();

      const orderTotal = Number(existingCancellation.total || 0);

      if (Number.isNaN(orderTotal) || orderTotal < 0) {
        await conn.rollback();
        return res.status(400).json({
          message: 'Invalid order total for cancellation processing.',
        });
      }

      let appliedPolicy = '';
      let enforcedRefund = 0;

      if (isWalkInOrder) {
        if (!isSameDay) {
          await conn.rollback();
          return res.status(400).json({
            message:
              'Walk-in cancellations can only be approved on the same day of sale.',
          });
        }

        if (['shipping', 'delivered', 'completed'].includes(effectiveStatus)) {
          await conn.rollback();
          return res.status(400).json({
            message:
              'Walk-in cancellations are no longer allowed after the order has already left the premises.',
          });
        }

        appliedPolicy = 'full_refund';
        enforcedRefund = roundCurrency(collectedAmount);
      } else if (isBlueprintOrder) {
        if (
          Boolean(contract) ||
          ['contract_released', 'production', 'shipping', 'delivered', 'completed'].includes(
            effectiveStatus
          )
        ) {
          appliedPolicy = 'non_refundable';
          enforcedRefund = 0;
        } else {
          if (collectedAmount <= 0) {
            await conn.rollback();
            return res.status(400).json({
              message:
                'A verified payment record is required before applying the processing fee policy.',
            });
          }

          const processingFeeAmount = roundCurrency(orderTotal * 0.15);

          appliedPolicy = 'processing_fee';
          enforcedRefund = roundCurrency(
            Math.max(0, collectedAmount - processingFeeAmount)
          );
        }
      } else {
        if (['shipping', 'delivered', 'completed'].includes(effectiveStatus)) {
          await conn.rollback();
          return res.status(400).json({
            message:
              'Standard product orders can only receive a full refund before shipment.',
          });
        }

        appliedPolicy = 'full_refund';
        enforcedRefund = roundCurrency(collectedAmount);
      }

      if (normalizedPolicy && normalizedPolicy !== appliedPolicy) {
        await conn.rollback();
        return res.status(400).json({
          message: `This cancellation must use the "${appliedPolicy.replace(/_/g, ' ')}" policy.`,
        });
      }

      await conn.query(
        `UPDATE cancellations
         SET approved_by = ?,
             approved_at = NOW(),
             refund_amount = ?,
             policy_applied = ?
         WHERE order_id = ?`,
        [req.user.id, enforcedRefund, appliedPolicy, req.params.id]
      );

      await conn.query(
        `UPDATE orders
         SET status = 'cancelled',
             refund_amount = ?,
             refund_status = CASE
               WHEN ? > 0 THEN 'pending'
               ELSE refund_status
             END,
             cancelled_at = NOW()
         WHERE id = ?`,
        [enforcedRefund, enforcedRefund, req.params.id]
      );

      await conn.commit();
      return res.json({
        message: 'Cancellation approved.',
        decision_status: 'approved',
        policy_applied: appliedPolicy,
        refund_amount: enforcedRefund,
      });
    }

    await conn.query(
      `UPDATE cancellations
       SET approved_by = ?,
           approved_at = NOW(),
           refund_amount = 0,
           policy_applied = NULL
       WHERE order_id = ?`,
      [req.user.id, req.params.id]
    );

    await conn.commit();
<<<<<<< HEAD:admin/backend/controllers/admin/orderController.js
    res.json({ message: "Cancellation processed." });
=======
    return res.json({
      message: 'Cancellation rejected.',
      decision_status: 'rejected',
    });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/orderController.js
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ══ ASSIGN STAFF TO BLUEPRINT ════════════════════════════════════════════════
exports.getAssignableStaff = async (req, res) => {
  try {
    const [[order]] = await pool.query(
      `SELECT
          o.id,
          o.status,
          o.type,
          COALESCE(
            o.blueprint_id,
            (
              SELECT c.blueprint_id
              FROM contracts c
              WHERE c.order_id = o.id
              ORDER BY
                CASE WHEN c.blueprint_id IS NULL THEN 1 ELSE 0 END,
                c.id DESC
              LIMIT 1
            )
          ) AS blueprint_id
       FROM orders o
       WHERE o.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!order.blueprint_id) {
      return res.status(400).json({
        message: 'This order is not linked to a blueprint.',
      });
    }

    const [[contract]] = await pool.query(
      `SELECT id
       FROM contracts
       WHERE order_id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (order.blueprint_id && !contract) {
      return res.status(400).json({
        message:
          'Generate the contract first before assigning staff to this blueprint order.',
      });
    }

    const [[delivery]] = await pool.query(
      `SELECT id, status, signed_receipt
       FROM deliveries
       WHERE order_id = ?
       LIMIT 1`,
      [req.params.id]
    );

    const [taskStatuses] = await pool.query(
      `SELECT status
       FROM project_tasks
       WHERE order_id = ?`,
      [req.params.id]
    );

    const effectiveStatus = inferOrderStatus({
      rawStatus: order.status,
      orderType: order.type,
      hasContract: Boolean(contract),
      delivery,
      blueprintTasks: taskStatuses,
    });

    const allowedAssignmentStatuses = ['contract_released', 'production'];

    if (!allowedAssignmentStatuses.includes(effectiveStatus)) {
      return res.status(400).json({
        message: 'Staff assignment is only available after contract release or during production.',
      });
    }

    const [staff] = await pool.query(
      `SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          (
            SELECT COUNT(*)
            FROM project_tasks pt
            WHERE pt.assigned_to = u.id
              AND pt.status IN ('pending', 'in_progress')
          ) AS active_task_count
       FROM users u
       WHERE u.role = 'staff'
         AND u.is_active = 1
       ORDER BY active_task_count ASC, u.name ASC`
    );

    res.json({
      order_id: Number(req.params.id),
      blueprint_id: Number(order.blueprint_id),
      status: effectiveStatus,
      staff,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignStaffToBlueprint = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const { staff_id, task_role, due_date, note = '' } = req.body;

    if (!staff_id) {
      await conn.rollback();
      return res.status(400).json({ message: 'Staff is required.' });
    }

    if (!task_role) {
      await conn.rollback();
      return res.status(400).json({ message: 'Task role is required.' });
    }

    const normalizedDueDate = String(due_date || '').trim();

    if (!normalizedDueDate) {
      await conn.rollback();
      return res.status(400).json({ message: 'Due date is required.' });
    }

    const parsedDueDate = new Date(
      normalizedDueDate.includes('T')
        ? normalizedDueDate
        : normalizedDueDate.replace(' ', 'T')
    );

    if (Number.isNaN(parsedDueDate.getTime())) {
      await conn.rollback();
      return res.status(400).json({ message: 'Due date is invalid.' });
    }

    if (parsedDueDate.getTime() < Date.now() - 60000) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Due date cannot be in the past.',
      });
    }

    const [[order]] = await conn.query(
      `SELECT
          o.id,
          o.order_number,
          o.status,
          o.type,
          COALESCE(
            o.blueprint_id,
            (
              SELECT c.blueprint_id
              FROM contracts c
              WHERE c.order_id = o.id
              ORDER BY
                CASE WHEN c.blueprint_id IS NULL THEN 1 ELSE 0 END,
                c.id DESC
              LIMIT 1
            )
          ) AS blueprint_id,
          COALESCE(u.name, o.walkin_customer_name) AS customer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.customer_id
       WHERE o.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!order.blueprint_id) {
      await conn.rollback();
      return res.status(400).json({
        message: 'This order is not linked to a blueprint.',
      });
    }

    const [[contract]] = await conn.query(
      `SELECT id
       FROM contracts
       WHERE order_id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (order.blueprint_id && !contract) {
      await conn.rollback();
      return res.status(400).json({
        message:
          'Generate the contract first before assigning staff to this blueprint order.',
      });
    }

    const [[delivery]] = await conn.query(
      `SELECT id, status, signed_receipt
       FROM deliveries
       WHERE order_id = ?
       LIMIT 1`,
      [req.params.id]
    );

    const [taskStatuses] = await conn.query(
      `SELECT status
       FROM project_tasks
       WHERE order_id = ?`,
      [req.params.id]
    );

    const effectiveStatus = inferOrderStatus({
      rawStatus: order.status,
      orderType: order.type,
      hasContract: Boolean(contract),
      delivery,
      blueprintTasks: taskStatuses,
    });

    const allowedAssignmentStatuses = ['contract_released', 'production'];

    if (!allowedAssignmentStatuses.includes(effectiveStatus)) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Staff assignment is only available after contract release or during production.',
      });
    }

    const [[staff]] = await conn.query(
      `SELECT id, name, role, is_active
       FROM users
       WHERE id = ?
         AND role = 'staff'
       LIMIT 1`,
      [staff_id]
    );

    if (!staff) {
      await conn.rollback();
      return res.status(404).json({ message: 'Staff not found.' });
    }

    if (Number(staff.is_active) !== 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'Selected staff is inactive.' });
    }

    const [[existingTask]] = await conn.query(
      `SELECT id, assigned_to, status
       FROM project_tasks
       WHERE order_id = ?
         AND blueprint_id = ?
         AND task_role = ?
         AND status IN ('pending', 'in_progress')
       LIMIT 1`,
      [req.params.id, order.blueprint_id, task_role]
    );

    if (existingTask) {
      await conn.rollback();
      return res.status(409).json({
        message: `An active "${task_role}" assignment already exists for this blueprint order.`,
      });
    }

    await conn.query(
      `UPDATE blueprints
       SET assigned_staff_id = ?,
           assign_task_type = ?,
           stage = CASE
             WHEN stage IN ('approval', 'estimation', 'design') THEN 'production'
             ELSE stage
           END
       WHERE id = ?`,
      [staff_id, task_role, order.blueprint_id]
    );

    await conn.query(
      `INSERT INTO project_tasks
         (order_id, blueprint_id, assigned_to, assigned_by, task_role, title, description, status, is_read, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [
        req.params.id,
        order.blueprint_id,
        staff_id,
        req.user.id,
        task_role,
        `${task_role} assignment for Order #${order.order_number || req.params.id}`,
        note ||
          `Assigned ${task_role.toLowerCase()} for blueprint order of ${order.customer_name || 'customer'}.`,
        normalizedDueDate,
      ]
    );

    await conn.query(
      `UPDATE orders
       SET status = CASE
         WHEN LOWER(COALESCE(status, '')) IN ('', 'null', 'pending', 'confirmed', 'contract_released')
           THEN 'production'
         ELSE status
       END
       WHERE id = ?`,
      [req.params.id]
    );

    await conn.commit();

    res.json({
      message: 'Staff assigned to blueprint successfully.',
      assignment: {
        order_id: Number(req.params.id),
        blueprint_id: Number(order.blueprint_id),
        staff_id: Number(staff_id),
        staff_name: staff.name,
        task_role,
        due_date: normalizedDueDate,
      },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

exports.updateBlueprintTaskStatus = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const nextStatus = String(req.body?.status || '').toLowerCase();
    const validStatuses = ['pending', 'in_progress', 'completed'];

    if (!validStatuses.includes(nextStatus)) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid task status.' });
    }

    const [[task]] = await conn.query(
      `SELECT
          pt.id,
          pt.order_id,
          pt.blueprint_id,
          pt.task_role,
          pt.status,
          pt.due_date,
          o.status AS order_status,
          o.type   AS order_type
      FROM project_tasks pt
      JOIN orders o ON o.id = pt.order_id
      WHERE pt.id = ?
        AND pt.order_id = ?
      LIMIT 1`,
      [req.params.taskId, req.params.id]
    );

    if (!task) {
      await conn.rollback();
      return res.status(404).json({ message: 'Project task not found.' });
    }

    const currentTaskStatus = String(task.status || '').toLowerCase();

    if (currentTaskStatus === nextStatus) {
      await conn.rollback();
      return res.json({ message: `Task status already "${nextStatus}".` });
    }

    const allowedTaskTransitions = {
      pending: ['in_progress'],
      in_progress: ['completed'],
      completed: [],
    };

    if (!allowedTaskTransitions[currentTaskStatus]?.includes(nextStatus)) {
      await conn.rollback();
      return res.status(400).json({
        message: `Invalid task transition from "${currentTaskStatus}" to "${nextStatus}". Start the task first before marking it completed.`,
      });
    }

    const hasDueDate = Boolean(String(task.due_date || '').trim());

    if ((nextStatus === 'in_progress' || nextStatus === 'completed') && !hasDueDate) {
      await conn.rollback();
      return res.status(400).json({
        message: 'A due date is required before starting or completing this task.',
      });
    }
    const lockedOrderStatuses = ['shipping', 'delivered', 'completed', 'cancelled'];

    const taskOrderType = String(task.order_type || '').toLowerCase();
    const isWalkInOrder =
      taskOrderType === 'walkin' || taskOrderType === 'walk-in';

    if (lockedOrderStatuses.includes(String(task.order_status || '').toLowerCase())) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Task status can no longer be updated once the order is already in delivery or completed.',
      });
    }

    await conn.query(
      `UPDATE project_tasks
       SET status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [nextStatus, req.params.taskId]
    );

    let autoAdvanced = false;
    let movedBackToProduction = false;

    if (task.blueprint_id) {
      const [[taskSummary]] = await conn.query(
        `SELECT
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks
         FROM project_tasks
         WHERE order_id = ?
           AND blueprint_id = ?`,
        [task.order_id, task.blueprint_id]
      );

      const totalTasks = Number(taskSummary?.total_tasks || 0);
      const completedTasks = Number(taskSummary?.completed_tasks || 0);
      const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;

      if (allTasksCompleted) {
        if (isWalkInOrder) {
          await conn.query(
            `UPDATE blueprints
            SET stage = CASE
              WHEN stage IN ('production', 'approval', 'estimation', 'design', 'delivery')
                THEN 'completed'
              ELSE stage
            END
            WHERE id = ?`,
            [task.blueprint_id]
          );

          await conn.query(
            `UPDATE orders
            SET status = CASE
              WHEN status IN ('production', 'contract_released', 'confirmed', 'shipping')
                THEN 'completed'
              ELSE status
            END
            WHERE id = ?`,
            [task.order_id]
          );
        } else {
          const [[existingDelivery]] = await conn.query(
            `SELECT id, driver_id, scheduled_date, address, status, signed_receipt, notes
            FROM deliveries
            WHERE order_id = ?
            LIMIT 1`,
            [task.order_id]
          );

          const [[orderDeliveryMeta]] = await conn.query(
            `SELECT
                COALESCE(u.address, o.delivery_address) AS resolved_delivery_address
            FROM orders o
            LEFT JOIN users u ON u.id = o.customer_id
            WHERE o.id = ?
            LIMIT 1`,
            [task.order_id]
          );

          const resolvedDeliveryAddress = String(
            orderDeliveryMeta?.resolved_delivery_address || ''
          ).trim();

          if (!resolvedDeliveryAddress) {
            await conn.rollback();
            return res.status(400).json({
              message:
                'A delivery address is required before moving this order to shipping.',
            });
          }

          let driverId = existingDelivery?.driver_id || null;

          if (!driverId) {
            const [[autoDriver]] = await conn.query(
              `SELECT
                  u.id
              FROM users u
              WHERE u.role = 'staff'
                AND u.is_active = 1
              ORDER BY
                (
                  SELECT COUNT(*)
                  FROM deliveries d2
                  WHERE d2.driver_id = u.id
                    AND DATE(d2.scheduled_date) = CURDATE()
                    AND d2.status IN ('scheduled', 'in_transit')
                ) ASC,
                u.name ASC
              LIMIT 1`
            );

            if (!autoDriver) {
              await conn.rollback();
              return res.status(400).json({
                message: 'No active staff is available to assign as delivery personnel.',
              });
            }

            driverId = autoDriver.id;
          }

          if (!existingDelivery) {
            await conn.query(
              `INSERT INTO deliveries
                (order_id, driver_id, scheduled_date, address, status, signed_receipt, notes)
              VALUES (?, ?, NOW(), ?, 'scheduled', NULL, ?)`,
              [
                task.order_id,
                driverId,
                resolvedDeliveryAddress,
                'Auto-created when blueprint tasks completed and order moved to shipping.',
              ]
            );
          } else {
            await conn.query(
              `UPDATE deliveries
              SET driver_id = COALESCE(driver_id, ?),
                  scheduled_date = COALESCE(scheduled_date, NOW()),
                  address = CASE
                    WHEN COALESCE(address, '') = '' THEN ?
                    ELSE address
                  END,
                  status = CASE
                    WHEN LOWER(COALESCE(status, '')) IN ('', 'failed') THEN 'scheduled'
                    WHEN LOWER(COALESCE(status, '')) = 'delivered' AND signed_receipt IS NOT NULL THEN status
                    ELSE status
                  END,
                  notes = CASE
                    WHEN COALESCE(notes, '') = '' THEN 'Auto-updated when blueprint tasks completed and order moved to shipping.'
                    ELSE notes
                  END
              WHERE order_id = ?`,
              [driverId, resolvedDeliveryAddress, task.order_id]
            );
          }

          await conn.query(
            `UPDATE blueprints
            SET stage = CASE
              WHEN stage IN ('production', 'approval', 'estimation', 'design')
                THEN 'delivery'
              ELSE stage
            END
            WHERE id = ?`,
            [task.blueprint_id]
          );

          await conn.query(
            `UPDATE orders
            SET status = CASE
              WHEN status IN ('production', 'contract_released', 'confirmed')
                THEN 'shipping'
              ELSE status
            END
            WHERE id = ?`,
            [task.order_id]
          );
        }

        autoAdvanced = true;
      } else {
        await conn.query(
          `UPDATE blueprints
          SET stage = CASE
            WHEN stage IN ('delivery', 'completed') THEN 'production'
            ELSE stage
          END
          WHERE id = ?`,
          [task.blueprint_id]
        );

        await conn.query(
          `UPDATE orders
          SET status = CASE
            WHEN status IN ('shipping', 'completed') THEN 'production'
            ELSE status
          END
          WHERE id = ?`,
          [task.order_id]
        );

        movedBackToProduction = true;
      }
    }

    const [[updatedTask]] = await conn.query(
      `SELECT
          pt.id,
          pt.order_id,
          pt.blueprint_id,
          pt.task_role,
          pt.title,
          pt.description,
          pt.status,
          pt.due_date,
          pt.created_at,
          pt.updated_at,
          assignee.id   AS assigned_to_id,
          assignee.name AS assigned_to_name,
          assigner.id   AS assigned_by_id,
          assigner.name AS assigned_by_name
       FROM project_tasks pt
       LEFT JOIN users assignee ON assignee.id = pt.assigned_to
       LEFT JOIN users assigner ON assigner.id = pt.assigned_by
       WHERE pt.id = ?
       LIMIT 1`,
      [req.params.taskId]
    );

    await conn.commit();

    res.json({
      message: autoAdvanced
        ? isWalkInOrder
          ? `Task status updated to "${nextStatus}". All blueprint tasks are completed. Walk-in order moved to completed.`
          : `Task status updated to "${nextStatus}". All blueprint tasks are completed. Production moved to delivery/shipping.`
        : movedBackToProduction
          ? `Task status updated to "${nextStatus}". Blueprint and order moved back to production.`
          : `Task status updated to "${nextStatus}".`,
      task: updatedTask,
      auto_advanced: autoAdvanced,
      moved_back_to_production: movedBackToProduction,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
}