// controllers/customer/customer.blueprints.js
const db = require("../../config/db"); // Uses the unified db config

/* ── Get All Blueprints (Gallery) ── */
exports.getAllBlueprints = async (req, res) => {
  const { q, wood_type, sort = "newest", page = 1, limit = 24 } = req.query;
  try {
    let where = "WHERE b.is_deleted = 0 AND b.is_gallery = 1";
    const params = [];

    if (q) {
      where += " AND (b.title LIKE ? OR b.description LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    if (wood_type) {
      where += " AND b.wood_type = ?";
      params.push(wood_type);
    }

    const sortMap = {
      newest: "b.created_at DESC",
      oldest: "b.created_at ASC",
      price_asc: "b.base_price ASC",
      price_desc: "b.base_price DESC",
      title_asc: "b.title ASC",
    };
    const orderBy = sortMap[sort] || "b.created_at DESC";
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [blueprints] = await db.execute(
      `SELECT b.id, b.title, b.description,
              b.base_price, b.wood_type,
              b.thumbnail_url, b.is_template,
              b.stage, b.created_at,
              u.name AS creator_name
       FROM blueprints b
       LEFT JOIN users u ON u.id = b.creator_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM blueprints b ${where}`,
      params,
    );

    const [woodTypes] = await db.execute(
      `SELECT DISTINCT wood_type FROM blueprints
       WHERE is_deleted=0 AND is_gallery=1
         AND wood_type IS NOT NULL AND wood_type != ''`,
    );

    res.json({
      blueprints,
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      wood_types: woodTypes.map((r) => r.wood_type),
    });
  } catch (err) {
    console.error("[customer.blueprints GET]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── Get Single Blueprint By ID ── */
exports.getBlueprintById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.*, u.name AS creator_name
       FROM blueprints b
       LEFT JOIN users u ON u.id = b.creator_id
       WHERE b.id = ? AND b.is_deleted = 0 AND b.is_gallery = 1`,
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Blueprint not found." });

    const blueprint = rows[0];
    const [components] = await db.execute(
      `SELECT * FROM blueprint_components WHERE blueprint_id = ?`,
      [blueprint.id],
    );
    blueprint.components = components;
    res.json(blueprint);
  } catch (err) {
    console.error("[customer.blueprints/:id]", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};
