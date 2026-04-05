// controllers/managementController.js [SCHEMA-CORRECTED]
// Fixed: warranties join, contracts columns, backup_logs columns, orders.type/total
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");

// ══ WARRANTY ══════════════════════════════════════════════════════════════════
exports.getAll = async (req, res) => {
  try {
    const { status, type, from, to, search, page = 1, limit = 20 } = req.query;
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
    const where = ["1=1"];
    const params = [];

    if (type) {
      where.push("o.type = ?");
      params.push(type);
    } // schema: o.type
    if (status) {
      where.push("w.status = ?");
      params.push(status);
    }
    if (from && to) {
      where.push("DATE(w.created_at) BETWEEN ? AND ?");
      params.push(from, to);
    }
    if (search) {
      where.push("(u.name LIKE ? OR w.product_name LIKE ?)");
=======
    const where = ['1=1'];
    const params = [];

    const normalizedType = String(type || '').trim().toLowerCase();
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    if (normalizedType) {
      if (normalizedType === 'walkin' || normalizedType === 'walk-in') {
        where.push(`LOWER(COALESCE(o.type, '')) IN ('walkin', 'walk-in')`);
      } else {
        where.push(`LOWER(COALESCE(o.type, '')) = ?`);
        params.push(normalizedType);
      }
    }

    if (normalizedStatus) {
      where.push(`LOWER(COALESCE(w.status, '')) = ?`);
      params.push(normalizedStatus);
    }

    if (from && to) {
      where.push('DATE(w.created_at) BETWEEN ? AND ?');
      params.push(from, to);
    }

    if (search) {
      where.push(`
        (
          COALESCE(u.name, o.walkin_customer_name, '') LIKE ?
          OR COALESCE(w.product_name, '') LIKE ?
        )
      `);
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `SELECT
          w.*,
          COALESCE(u.name, o.walkin_customer_name, 'Walk-in Customer') AS customer_name,
          COALESCE(u.email, '') AS customer_email,
          o.type AS order_channel,
          fa.name AS fulfilled_by_name
       FROM warranties w
       LEFT JOIN users u ON u.id = w.customer_id
       LEFT JOIN orders o ON o.id = w.order_id
       LEFT JOIN users fa ON fa.id = w.fulfilled_by
       WHERE ${where.join(" AND ")}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
      [...params, parseInt(limit), (page - 1) * parseInt(limit)],
=======
      [...params, limitNum, offset]
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM warranties w
       LEFT JOIN users u ON u.id = w.customer_id
       LEFT JOIN orders o ON o.id = w.order_id
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
       WHERE ${where.join(" AND ")}`,
      params,
=======
       WHERE ${where.join(' AND ')}`,
      params
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
    );

    res.json({ rows, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
    const { status } = req.body;
    const update = { status };
    if (status === "fulfilled") {
      update.fulfilled_by = req.user.id;
      update.fulfilled_at = new Date();
      if (req.file)
        update.replacement_receipt = `/uploads/warranty/${req.file.filename}`;
    }
    const sets = Object.keys(update)
      .map((k) => `${k} = ?`)
      .join(", ");
    await pool.query(`UPDATE warranties SET ${sets} WHERE id = ?`, [
      ...Object.values(update),
      req.params.id,
    ]);
    res.json({ message: "Warranty claim updated." });
=======
    const nextStatus = String(req.body?.status || '').trim().toLowerCase();
    const validStatuses = ['approved', 'rejected', 'fulfilled'];

    if (!validStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid warranty status.' });
    }

    const [[claim]] = await pool.query(
      `SELECT
          id,
          status,
          warranty_expiry,
          replacement_receipt,
          fulfilled_by,
          fulfilled_at
       FROM warranties
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!claim) {
      return res.status(404).json({ message: 'Warranty claim not found.' });
    }

    const currentStatus = String(claim.status || '').trim().toLowerCase();

    if (['rejected', 'fulfilled'].includes(currentStatus)) {
      return res.status(400).json({
        message: 'This warranty claim has already been closed.',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = claim.warranty_expiry ? new Date(claim.warranty_expiry) : null;
    if (expiryDate) expiryDate.setHours(0, 0, 0, 0);

    const isExpired = expiryDate && expiryDate < today;

    // Pending → Approve / Reject only
    if (currentStatus === 'pending') {
      if (!['approved', 'rejected'].includes(nextStatus)) {
        return res.status(400).json({
          message: 'Pending claims can only be approved or rejected.',
        });
      }

      if (nextStatus === 'approved' && isExpired) {
        return res.status(400).json({
          message: 'This warranty claim is already outside the warranty period.',
        });
      }

      await pool.query(
        `UPDATE warranties
        SET status = ?,
            updated_at = NOW()
        WHERE id = ?`,
        [nextStatus, req.params.id]
      );

      return res.json({
        message:
          nextStatus === 'approved'
            ? 'Warranty claim approved.'
            : 'Warranty claim rejected.',
      });
    }

    // Approved → Fulfilled only
    if (currentStatus === 'approved') {
      if (nextStatus !== 'fulfilled') {
        return res.status(400).json({
          message: 'Approved claims can only be marked as fulfilled.',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message:
            'Replacement receipt is required before marking this claim as fulfilled.',
        });
      }

      const replacementReceiptUrl = `/uploads/warranty/${req.file.filename}`;

      await pool.query(
        `UPDATE warranties
         SET status = 'fulfilled',
             replacement_receipt = ?,
             fulfilled_by = ?,
             fulfilled_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [replacementReceiptUrl, req.user.id, req.params.id]
      );

      return res.json({
        message: 'Warranty fulfilled. Replacement receipt uploaded.',
      });
    }

    return res.status(400).json({
      message: 'Invalid warranty state.',
    });
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ══ CONTRACTS ════════════════════════════════════════════════════════════════
exports.getContracts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*,
              COALESCE(u.name, c.customer_name)   AS customer_name,
              u.email                              AS customer_email,
              o.total                              AS total_amount,   -- schema: total
              b.title                              AS blueprint_title,
              au.name                              AS issued_by_name
       FROM contracts c
       LEFT JOIN orders     o  ON o.id  = c.order_id
       LEFT JOIN users      u  ON u.id  = o.customer_id
       LEFT JOIN blueprints b  ON b.id  = c.blueprint_id
       LEFT JOIN users      au ON au.id = c.authorized_by
       ORDER BY c.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateContract = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const { order_id, blueprint_id, terms, warranty_terms } = req.body;

<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
    // Get customer info from the order
    const [[order]] = await pool.query(
      `SELECT o.customer_id, COALESCE(u.name, o.walkin_customer_name) AS customer_name
       FROM orders o LEFT JOIN users u ON u.id = o.customer_id WHERE o.id = ?`,
      [order_id],
    );
    if (!order) return res.status(404).json({ message: "Order not found." });
=======
    const normalizedBlueprintId =
      blueprint_id == null || blueprint_id === ''
        ? null
        : Number(blueprint_id);
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js

    if (normalizedBlueprintId !== null && (!Number.isInteger(normalizedBlueprintId) || normalizedBlueprintId <= 0)) {
      await conn.rollback();
      return res.status(400).json({ message: 'Blueprint ID must be a valid positive number.' });
    }

    if (!order_id) {
      await conn.rollback();
      return res.status(400).json({ message: 'Order is required.' });
    }

    if (!String(terms || '').trim()) {
      await conn.rollback();
      return res.status(400).json({ message: 'Contract terms are required.' });
    }

    if (!String(warranty_terms || '').trim()) {
      await conn.rollback();
      return res.status(400).json({ message: 'Warranty terms are required.' });
    }

    const [[existingContract]] = await conn.query(
      `SELECT id, order_id, blueprint_id
       FROM contracts
       WHERE order_id = ?
       LIMIT 1`,
      [order_id]
    );

    const [[order]] = await conn.query(
      `SELECT
          o.id,
          o.customer_id,
          o.status,
          o.payment_status,
          o.type,
          o.order_type,
          o.total,
          o.blueprint_id,
          COALESCE(u.name, o.walkin_customer_name) AS customer_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE o.id = ?
      LIMIT 1`,
      [order_id]
    );



    if (!order) {
      await conn.rollback();
      return res.status(404).json({ message: 'Order not found.' });
    }

    const currentOrderStatus = String(order.status || '').toLowerCase();
    const finalBlueprintId =
      normalizedBlueprintId || order.blueprint_id || existingContract?.blueprint_id || null;

    const normalizedOrderType = String(order.order_type || '').toLowerCase();
    const isBlueprintOrder =
      normalizedOrderType === 'blueprint' || Boolean(finalBlueprintId);

    if (!isBlueprintOrder) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Contracts can only be generated for blueprint orders.',
      });
    }

    if (['cancelled', 'completed', 'shipping', 'delivered'].includes(currentOrderStatus)) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Contract can only be generated for active blueprint orders.',
      });
    }

    if (!finalBlueprintId) {
      await conn.rollback();
      return res.status(400).json({
        message: 'A linked blueprint is required before generating a contract.',
      });
    }

    const [[blueprint]] = await conn.query(
      `SELECT id, stage, is_deleted
       FROM blueprints
       WHERE id = ?
       LIMIT 1`,
      [finalBlueprintId]
    );

    if (!blueprint) {
      await conn.rollback();
      return res.status(404).json({ message: 'Linked blueprint not found.' });
    }

    if (Number(blueprint.is_deleted) === 1) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Cannot generate a contract from an archived blueprint.',
      });
    }

    const [[latestEstimation]] = await conn.query(
      `SELECT id, status
       FROM estimations
       WHERE blueprint_id = ?
       ORDER BY version DESC, id DESC
       LIMIT 1`,
      [finalBlueprintId]
    );

    if (!latestEstimation) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Save and approve the blueprint estimation first before generating a contract.',
      });
    }

    if (String(latestEstimation.status || '').toLowerCase() !== 'approved') {
      await conn.rollback();
      return res.status(400).json({
        message: 'Only approved estimations can proceed to contract generation.',
      });
    }

    const [[verifiedPaymentTotals]] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) AS verified_total
      FROM payment_transactions
      WHERE order_id = ?
        AND status = 'verified'`,
      [order_id]
    );

    const normalizedPaymentStatus = String(order.payment_status || '').toLowerCase();
    const orderTotal = Number(order.total || 0);
        if (orderTotal <= 0) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Order total must be greater than zero before generating a contract.',
      });
    }
    const requiredDownPayment = orderTotal * 0.3;
    const verifiedPaymentTotal = Number(verifiedPaymentTotals?.verified_total || 0);

    if (
      normalizedPaymentStatus !== 'paid' &&
      verifiedPaymentTotal < Math.max(0, requiredDownPayment - 0.01)
    ) {
      await conn.rollback();
      return res.status(400).json({
        message: 'At least 30% verified down payment or full paid status is required before generating a contract.',
      });
    }

    if (existingContract) {
      await conn.query(
        `UPDATE orders
         SET status = CASE
           WHEN LOWER(COALESCE(status, '')) IN ('', 'pending', 'confirmed')
             THEN 'contract_released'
           ELSE status
         END,
         blueprint_id = COALESCE(blueprint_id, ?)
         WHERE id = ?`,
        [finalBlueprintId, order_id]
      );

      await conn.commit();

      return res.status(409).json({
        message: `A contract already exists for order #${String(order_id).padStart(5, '0')}.`,
        contract_id: existingContract.id,
      });
    }

    const [r] = await conn.query(
      `INSERT INTO contracts
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
         (order_id, blueprint_id, customer_id, customer_name, warranty_terms, materials_used, authorized_by, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [
        order_id,
        blueprint_id || null,
        order.customer_id,
        order.customer_name,
        warranty_terms,
        terms,
        req.user.id,
      ],
    );

    // Update order status
    await pool.query(
      "UPDATE orders SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
      [order_id],
    );

    res.status(201).json({ message: "Contract generated.", id: r.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
=======
        (order_id, blueprint_id, customer_id, customer_name, warranty_terms, materials_used, authorized_by, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [
        order_id,
        finalBlueprintId,
        order.customer_id,
        order.customer_name,
        String(warranty_terms || '').trim(),
        String(terms || '').trim(),
        req.user.id,
      ]
    );

    await conn.query(
      `UPDATE orders
       SET status = CASE
         WHEN LOWER(COALESCE(status, '')) IN ('', 'pending', 'confirmed')
           THEN 'contract_released'
         ELSE status
       END,
       blueprint_id = COALESCE(blueprint_id, ?)
       WHERE id = ?`,
      [finalBlueprintId, order_id]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Contract generated. Order advanced to contract_released.',
      id: r.insertId,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
  }
};
// ══ CUSTOMERS ════════════════════════════════════════════════════════════════

exports.getCustomers = async (req, res) => {
  try {
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
    const { search, approval_status, page = 1, limit = 20 } = req.query;
    const where = ["role = 'customer'"];
    const params = [];

    if (search) {
      where.push("(name LIKE ? OR email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (approval_status) {
      where.push("approval_status = ?");
      params.push(approval_status);
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, address, is_active, is_verified,
              approval_status, created_at, last_login
       FROM users WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (page - 1) * parseInt(limit)],
=======
    const { search, is_verified, page = 1, limit = 20 } = req.query;

    const where = ["role = 'customer'"];
    const params = [];

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    if (search) {
      where.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_verified === '1' || is_verified === '0') {
      where.push('is_verified = ?');
      params.push(Number(is_verified));
    }

    const [rows] = await pool.query(
      `SELECT
          id,
          name,
          email,
          phone,
          address,
          is_active,
          is_verified,
          created_at,
          last_login
       FROM users
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
    );

    const [[{ total }]] = await pool.query(
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
      `SELECT COUNT(*) AS total FROM users WHERE ${where.join(" AND ")}`,
      params,
=======
      `SELECT COUNT(*) AS total
       FROM users
       WHERE ${where.join(' AND ')}`,
      params
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js
    );

    res.json({ rows, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const { action } = req.body;

    if (action === 'delete') {
      await pool.query(
        "DELETE FROM users WHERE id = ? AND role = 'customer'",
        [req.params.id]
      );
      return res.json({ message: 'Customer deleted.' });
    }

    const map = {
<<<<<<< HEAD:admin/backend/controllers/admin/managementController.js
      approve: { approval_status: "approved", is_active: 1 },
      reject: { approval_status: "rejected" },
      activate: { is_active: 1 },
      deactivate: { is_active: 0 },
    };
    if (action === "delete") {
      await pool.query("DELETE FROM users WHERE id = ? AND role = 'customer'", [
        req.params.id,
      ]);
      return res.json({ message: "Customer deleted." });
    }
    if (!map[action])
      return res.status(400).json({ message: "Invalid action." });
    const sets = Object.keys(map[action])
      .map((k) => `${k} = ?`)
      .join(", ");
    await pool.query(
      `UPDATE users SET ${sets}, approved_by = ?, approved_at = NOW() WHERE id = ?`,
      [...Object.values(map[action]), req.user.id, req.params.id],
    );
    res.json({ message: `Customer ${action}d.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
=======
      activate:   { is_active: 1 },
      deactivate: { is_active: 0 },
    };
>>>>>>> 4c8e2bc (Update current admin work):backend/controllers/managementController.js

    if (!map[action]) {
      return res.status(400).json({ message: 'Invalid action.' });
    }

    const sets = Object.keys(map[action]).map((k) => `${k} = ?`).join(', ');

    await pool.query(
      `UPDATE users
       SET ${sets}
       WHERE id = ? AND role = 'customer'`,
      [...Object.values(map[action]), req.params.id]
    );

    const messages = {
      activate: 'Customer activated.',
      deactivate: 'Customer deactivated.',
    };

    res.json({ message: messages[action] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// ══ USERS ════════════════════════════════════════════════════════════════════
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, phone, is_active, last_login, created_at
       FROM users WHERE role IN ('admin','staff') ORDER BY role, name`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const [r] = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, is_verified, approval_status, is_active)
       VALUES (?,?,?,?,?,1,'approved',1)`,
      [name, email, hashed, role, phone],
    );
    res.status(201).json({ message: "User created.", id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Email already in use." });
    res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, phone, is_active } = req.body;
    await pool.query(
      'UPDATE users SET name=?,email=?,role=?,phone=?,is_active=? WHERE id=? AND role != "customer"',
      [name, email, role, phone, is_active ? 1 : 0, req.params.id],
    );
    res.json({ message: "User updated." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    const hashed = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      req.params.id,
    ]);
    res.json({ message: "Password reset." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id == req.user.id)
      return res
        .status(400)
        .json({ message: "Cannot delete your own account." });
    await pool.query("DELETE FROM users WHERE id = ? AND role != 'customer'", [
      req.params.id,
    ]);
    res.json({ message: "User deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
