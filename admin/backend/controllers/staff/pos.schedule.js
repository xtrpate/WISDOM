// controllers/staff/pos.schedule.js
const db = require("../../config/db"); // Uses the unified db config

const ALLOWED_PURPOSES = new Set([
  "consultation",
  "site_measurement",
  "installation",
]);

const ALLOWED_STATUSES = new Set(["pending", "confirmed", "done", "cancelled"]);

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

  const [rows] = await db.execute(
    `SELECT id, name, role FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );

  if (!rows.length) return null;

  const user = rows[0];
  if (!allowedRoles.includes(user.role)) return null;

  return user;
};

/* ══════════════════════════════════════════════════════════════
   APPOINTMENTS LOGIC
══════════════════════════════════════════════════════════════ */

/* ── List Appointments ── */
exports.getAppointments = async (req, res) => {
  try {
    const [rows] = await db.execute(`
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

    return res.json(rows);
  } catch (err) {
    console.error("[pos.appointments GET]", err);
    return res.status(500).json({
      message: "Failed to load appointments.",
      error: err.message,
    });
  }
};

/* ── Schedule an Appointment ── */
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

    if (!ALLOWED_PURPOSES.has(purpose)) {
      return res.status(400).json({ message: "Invalid appointment purpose." });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        message: "Scheduled date and time are required.",
      });
    }

    if (customerId) {
      const customer = await ensureUserHasRole(customerId, ["customer"]);
      if (!customer) {
        return res.status(400).json({
          message: "Selected customer was not found.",
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
          message: "Selected provider/staff was not found.",
        });
      }
    }

    const [result] = await db.execute(
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

    return res.status(201).json({
      message: "Appointment scheduled successfully.",
      appointment_id: result.insertId,
      handled_by: {
        id: req.user.id,
        name: req.user.name,
      },
      assigned_provider: providerUser
        ? { id: providerUser.id, name: providerUser.name }
        : null,
    });
  } catch (err) {
    console.error("[pos.appointments POST]", err);
    return res.status(500).json({
      message: "Failed to create appointment.",
      error: err.message,
    });
  }
};

/* ── Update an Appointment ── */
exports.updateAppointment = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        handled_by,
        provider_id,
        request_owner_id,
        status,
        notes
      FROM appointments
      WHERE id = ?
      LIMIT 1
      `,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    const current = rows[0];

    let handledBy = current.handled_by ?? null;
    let providerId = current.provider_id ?? null;
    let requestOwnerId = current.request_owner_id ?? null;
    let status = current.status;
    let notes = current.notes;

    if (Object.prototype.hasOwnProperty.call(req.body, "notes")) {
      notes = normalizeText(req.body.notes) || null;
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
            message: "Selected provider/staff was not found.",
          });
        }

        providerId = requestedProviderId;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      const requestedStatus = normalizeText(req.body.status).toLowerCase();

      if (!ALLOWED_STATUSES.has(requestedStatus)) {
        return res.status(400).json({ message: "Invalid appointment status." });
      }

      if (current.status === "done" && requestedStatus !== "done") {
        return res.status(400).json({
          message: "Completed appointments can no longer be changed.",
        });
      }

      if (requestedStatus === "done" && current.status !== "confirmed") {
        return res.status(400).json({
          message: "Only confirmed appointments can be marked as done.",
        });
      }

      if (requestedStatus === "confirmed") {
        if (!handledBy) handledBy = req.user.id;
        if (!requestOwnerId) requestOwnerId = req.user.id;
      }

      status = requestedStatus;
    }

    await db.execute(
      `
      UPDATE appointments
      SET
        handled_by = ?,
        provider_id = ?,
        request_owner_id = ?,
        status = ?,
        notes = ?
      WHERE id = ?
      `,
      [handledBy, providerId, requestOwnerId, status, notes, req.params.id],
    );

    return res.json({
      message: "Appointment updated successfully.",
    });
  } catch (err) {
    console.error("[pos.appointments PATCH]", err);
    return res.status(500).json({
      message: "Failed to update appointment.",
      error: err.message,
    });
  }
};
