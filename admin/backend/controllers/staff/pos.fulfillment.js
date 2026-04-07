// controllers/staff/pos.fulfillment.js
const db = require("../../config/db");

const DELIVERY_STATUSES = ["scheduled", "in_transit", "delivered", "failed"];
const APPOINTMENT_STATUSES = ["pending", "confirmed", "done", "cancelled"];
const APPOINTMENT_PURPOSES = [
  "consultation",
  "site_measurement",
  "installation",
];

/* ── Helper Functions ── */
const normalizeText = (value) => String(value || "").trim();

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const normalizeDateTime = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const cleaned = raw.replace("T", " ");
  return cleaned.length === 16 ? `${cleaned}:00` : cleaned;
};

const ensureUserHasRole = async (userId, allowedRoles) => {
  if (!userId) return null;
  const [rows] = await db.query(
    `SELECT id, name, role FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  if (!rows.length) return null;
  const user = rows[0];
  if (!allowedRoles.includes(user.role)) return null;
  return user;
};

const getAppointmentById = async (appointmentId) => {
  const [rows] = await db.query(
    `
    SELECT
      a.id,
      a.order_id,
      a.customer_id,
      a.handled_by,
      a.provider_id,
      a.request_owner_id,
      COALESCE(a.handled_by, a.request_owner_id) AS handled_by_id,
      COALESCE(a.provider_id, a.handled_by, a.request_owner_id) AS assigned_to,
      a.purpose,
      a.scheduled_date,
      a.preferred_date,
      a.status,
      a.notes,
      a.updated_at,

      o.order_number,
      o.total,
      o.payment_method,
      o.created_at AS order_created_at,

      COALESCE(o.walkin_customer_name, customer.name, 'Walk-in Customer') AS customer_name,
      COALESCE(o.walkin_customer_phone, customer.phone, '') AS customer_phone,

      handler.name AS handled_by_name,
      provider.name AS provider_name,
      COALESCE(provider.name, handler.name) AS assigned_to_name

    FROM appointments a
    LEFT JOIN orders o ON o.id = a.order_id
    LEFT JOIN users customer ON customer.id = a.customer_id
    LEFT JOIN users handler ON handler.id = COALESCE(a.handled_by, a.request_owner_id)
    LEFT JOIN users provider ON provider.id = a.provider_id
    WHERE a.id = ?
    LIMIT 1
    `,
    [appointmentId],
  );
  return rows[0] || null;
};

/* ══════════════════════════════════════════════════════════════
   DELIVERIES LOGIC
══════════════════════════════════════════════════════════════ */

// 👉 NEW: This is the missing function the frontend is asking for!
exports.getDeliverableOrders = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT 
        o.id,
        o.order_number,
        o.created_at,
        COALESCE(c.name, o.walkin_customer_name, 'Walk-in Customer') AS customer_name,
        COALESCE(c.phone, o.walkin_customer_phone, 'No phone provided') AS customer_phone,
        COALESCE(o.address, c.address, 'No address provided') AS delivery_address,
        o.total,
        o.status AS order_status,
        o.delivery_status,
        o.payment_method
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.id
      WHERE o.status != 'cancelled' 
        AND (o.delivery_status IS NULL OR o.delivery_status IN ('pending', 'scheduled', 'in_transit'))
      ORDER BY o.created_at ASC
    `);

    res.json(orders);
  } catch (err) {
    console.error("GET /api/pos/deliverable-orders error:", err);
    res.status(500).json({ message: "Failed to fetch deliverable orders" });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.order_id,
        d.driver_id,
        d.scheduled_date,
        d.delivered_date,
        d.address,
        d.status,
        d.notes,
        d.updated_at,

        o.order_number,
        o.total,
        o.payment_method,
        o.created_at AS order_created_at,

        COALESCE(o.walkin_customer_name, customer.name, 'Walk-in Customer') AS customer_name,
        COALESCE(o.walkin_customer_phone, customer.phone, '') AS customer_phone,

        driver.name AS driver_name
      FROM deliveries d
      INNER JOIN orders o ON o.id = d.order_id
      LEFT JOIN users customer ON customer.id = o.customer_id
      LEFT JOIN users driver ON driver.id = d.driver_id
      ORDER BY d.updated_at DESC, d.id DESC
      LIMIT 200
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/pos/deliveries error:", err);
    res.status(500).json({ message: "Failed to load deliveries" });
  }
};

exports.createDelivery = async (req, res) => {
  const { order_id, address, scheduled_date, notes } = req.body;

  if (!order_id || !address || !scheduled_date) {
    return res.status(400).json({
      message: "order_id, address, and scheduled_date are required",
    });
  }

  try {
    const [[order]] = await db.query(
      `
      SELECT
        o.id,
        o.order_number,
        COALESCE(o.walkin_customer_name, customer.name, 'Walk-in Customer') AS customer_name
      FROM orders o
      LEFT JOIN users customer ON customer.id = o.customer_id
      WHERE o.id = ?
      `,
      [order_id],
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const [result] = await db.query(
      `
      INSERT INTO deliveries (
        order_id,
        driver_id,
        scheduled_date,
        delivered_date,
        address,
        status,
        notes
      )
      VALUES (?, NULL, ?, NULL, ?, 'scheduled', ?)
      `,
      [order_id, scheduled_date, address, notes || null],
    );

    const [[delivery]] = await db.query(
      `
      SELECT
        d.id,
        d.order_id,
        d.driver_id,
        d.scheduled_date,
        d.delivered_date,
        d.address,
        d.status,
        d.notes,
        d.updated_at,

        o.order_number,
        o.total,
        o.payment_method,
        o.created_at AS order_created_at,

        COALESCE(o.walkin_customer_name, customer.name, 'Walk-in Customer') AS customer_name,
        COALESCE(o.walkin_customer_phone, customer.phone, '') AS customer_phone,

        driver.name AS driver_name
      FROM deliveries d
      INNER JOIN orders o ON o.id = d.order_id
      LEFT JOIN users customer ON customer.id = o.customer_id
      LEFT JOIN users driver ON driver.id = d.driver_id
      WHERE d.id = ?
      `,
      [result.insertId],
    );

    res.status(201).json({
      message: "Delivery scheduled successfully",
      delivery,
      assigned_driver: null,
    });
  } catch (err) {
    console.error("POST /api/pos/deliveries error:", err);
    res.status(500).json({ message: "Failed to schedule delivery" });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!DELIVERY_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid delivery status" });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [[existing]] = await conn.query(
      `SELECT * FROM deliveries WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!existing) {
      await conn.rollback();
      return res.status(404).json({ message: "Delivery not found" });
    }

    const deliveredDate =
      status === "delivered" ? new Date() : existing.delivered_date;

    await conn.query(
      `
      UPDATE deliveries
      SET status = ?, notes = ?, delivered_date = ?
      WHERE id = ?
      `,
      [status, notes ?? existing.notes ?? null, deliveredDate, id],
    );

    if (status === "in_transit") {
      await conn.query(`UPDATE orders SET status = 'shipping' WHERE id = ?`, [
        existing.order_id,
      ]);
    } else if (status === "delivered") {
      await conn.query(`UPDATE orders SET status = 'delivered' WHERE id = ?`, [
        existing.order_id,
      ]);
    }

    const [[updated]] = await conn.query(
      `
      SELECT
        d.id,
        d.order_id,
        d.driver_id,
        d.scheduled_date,
        d.delivered_date,
        d.address,
        d.status,
        d.notes,
        d.updated_at,
        o.order_number,
        COALESCE(o.walkin_customer_name, customer.name, 'Walk-in Customer') AS customer_name,
        driver.name AS driver_name
      FROM deliveries d
      INNER JOIN orders o ON o.id = d.order_id
      LEFT JOIN users customer ON customer.id = o.customer_id
      LEFT JOIN users driver ON driver.id = d.driver_id
      WHERE d.id = ?
      `,
      [id],
    );

    await conn.commit();
    res.json({
      message: "Delivery status updated successfully",
      delivery: updated,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("PATCH /api/pos/deliveries/:id/status error:", err);
    res.status(500).json({ message: "Failed to update delivery status" });
  } finally {
    if (conn) conn.release();
  }
};

/* ══════════════════════════════════════════════════════════════
   APPOINTMENTS LOGIC
══════════════════════════════════════════════════════════════ */

exports.getAppointments = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.id,
        a.order_id,
        a.customer_id,
        a.handled_by,
        a.provider_id,
        a.request_owner_id,
        COALESCE(a.handled_by, a.request_owner_id) AS handled_by_id,
        COALESCE(a.provider_id, a.handled_by, a.request_owner_id) AS assigned_to,
        a.purpose,
        a.scheduled_date,
        a.preferred_date,
        a.status,
        a.notes,
        a.updated_at,

        o.order_number,
        o.total,
        o.payment_method,
        o.created_at AS order_created_at,

        COALESCE(o.walkin_customer_name, customer.name, 'Walk-in Customer') AS customer_name,
        COALESCE(o.walkin_customer_phone, customer.phone, '') AS customer_phone,

        handler.name AS handled_by_name,
        provider.name AS provider_name,
        COALESCE(provider.name, handler.name) AS assigned_to_name

      FROM appointments a
      LEFT JOIN orders o ON o.id = a.order_id
      LEFT JOIN users customer ON customer.id = a.customer_id
      LEFT JOIN users handler ON handler.id = COALESCE(a.handled_by, a.request_owner_id)
      LEFT JOIN users provider ON provider.id = a.provider_id
      ORDER BY
        FIELD(a.status, 'pending', 'confirmed', 'done', 'cancelled'),
        a.scheduled_date ASC,
        a.id DESC
      LIMIT 200
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/pos/appointments error:", err);
    res.status(500).json({
      message: "Failed to load appointments",
      error: err.message,
    });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const orderId = toNullableInt(req.body.order_id);
    const customerId = toNullableInt(req.body.customer_id);
    const purpose =
      normalizeText(req.body.purpose).toLowerCase() || "installation";
    const scheduledDate = normalizeDateTime(req.body.scheduled_date);
    const preferredDate =
      normalizeDateTime(req.body.preferred_date) || scheduledDate;
    const notes = normalizeText(req.body.notes) || null;
    const providerIdFromBody = toNullableInt(req.body.provider_id);
    const assignMeAsProvider = Boolean(req.body.assign_me_as_provider);

    if (!APPOINTMENT_PURPOSES.includes(purpose)) {
      return res.status(400).json({ message: "Invalid appointment purpose" });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        message: "Scheduled date and time are required",
      });
    }

    if (customerId) {
      const customer = await ensureUserHasRole(customerId, ["customer"]);
      if (!customer) {
        return res.status(400).json({
          message: "Selected customer was not found",
        });
      }
    }

    let providerId = providerIdFromBody;
    if (!providerId && assignMeAsProvider) {
      providerId = req.user.id;
    }

    let providerUser = null;
    if (providerId) {
      providerUser = await ensureUserHasRole(providerId, ["staff", "admin"]);
      if (!providerUser) {
        return res.status(400).json({
          message: "Selected provider/staff was not found",
        });
      }
    }

    const [result] = await db.query(
      `
      INSERT INTO appointments
        (
          order_id,
          customer_id,
          handled_by,
          provider_id,
          request_owner_id,
          purpose,
          scheduled_date,
          preferred_date,
          status,
          notes
        )
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
      `,
      [
        orderId || null,
        customerId || null,
        req.user.id,
        providerId || null,
        req.user.id,
        purpose,
        scheduledDate,
        preferredDate,
        notes,
      ],
    );

    const appointment = await getAppointmentById(result.insertId);

    res.status(201).json({
      message: "Appointment scheduled successfully",
      appointment,
      handled_by_user: {
        id: req.user.id,
        name: req.user.name,
      },
      assigned_provider: providerUser
        ? { id: providerUser.id, name: providerUser.name }
        : null,
    });
  } catch (err) {
    console.error("POST /api/pos/appointments error:", err);
    res.status(500).json({
      message: "Failed to create appointment",
      error: err.message,
    });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const [[existing]] = await db.query(
      `
      SELECT
        id,
        handled_by,
        provider_id,
        request_owner_id,
        status,
        notes,
        scheduled_date
      FROM appointments
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    let handledBy = existing.handled_by ?? null;
    let providerId = existing.provider_id ?? null;
    let requestOwnerId = existing.request_owner_id ?? null;
    let status = existing.status;
    let notes = existing.notes ?? null;
    let scheduledDate = existing.scheduled_date ?? null;

    if (Object.prototype.hasOwnProperty.call(req.body, "notes")) {
      notes = normalizeText(req.body.notes) || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "scheduled_date")) {
      const normalized = normalizeDateTime(req.body.scheduled_date);
      if (normalized) scheduledDate = normalized;
    }

    if (req.body.claim_request || req.body.assign_to_me) {
      handledBy = req.user.id;
      requestOwnerId = req.user.id;
    }

    if (req.body.set_me_as_provider) {
      providerId = req.user.id;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "provider_id")) {
      const requestedProviderId = toNullableInt(req.body.provider_id);

      if (!requestedProviderId) {
        providerId = null;
      } else {
        const providerUser = await ensureUserHasRole(requestedProviderId, [
          "staff",
          "admin",
        ]);

        if (!providerUser) {
          return res.status(400).json({
            message: "Selected provider/staff was not found",
          });
        }

        providerId = requestedProviderId;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      const requestedStatus = normalizeText(req.body.status).toLowerCase();

      if (!APPOINTMENT_STATUSES.includes(requestedStatus)) {
        return res.status(400).json({ message: "Invalid appointment status" });
      }

      if (existing.status === "done" && requestedStatus !== "done") {
        return res.status(400).json({
          message: "Completed appointments can no longer be changed",
        });
      }

      if (requestedStatus === "done" && existing.status !== "confirmed") {
        return res.status(400).json({
          message: "Only confirmed appointments can be marked as done",
        });
      }

      if (requestedStatus === "confirmed") {
        if (!handledBy) handledBy = req.user.id;
        if (!requestOwnerId) requestOwnerId = req.user.id;
      }

      status = requestedStatus;
    }

    await db.query(
      `
      UPDATE appointments
      SET
        handled_by = ?,
        provider_id = ?,
        request_owner_id = ?,
        status = ?,
        notes = ?,
        scheduled_date = ?
      WHERE id = ?
      `,
      [handledBy, providerId, requestOwnerId, status, notes, scheduledDate, id],
    );

    const updated = await getAppointmentById(id);

    res.json({
      message: "Appointment updated successfully",
      appointment: updated,
    });
  } catch (err) {
    console.error("PATCH /api/pos/appointments/:id error:", err);
    res.status(500).json({
      message: "Failed to update appointment",
      error: err.message,
    });
  }
};
