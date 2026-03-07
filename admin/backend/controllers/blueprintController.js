// controllers/blueprintController.js [SCHEMA-CORRECTED]
// estimations table: blueprint_id, estimation_data JSON, material_cost, labor_cost, tax, discount, grand_total
const pool = require('../config/db');

// ── GET /api/blueprints ───────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { tab = 'my', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = []; const params = [];

    if (tab === 'my')      { where.push('b.creator_id = ? AND b.is_deleted = 0'); params.push(req.user.id); }
    if (tab === 'imports') { where.push('b.source = "imported" AND b.is_deleted = 0'); }
    if (tab === 'gallery') { where.push('(b.is_template = 1 OR b.is_gallery = 1) AND b.is_deleted = 0'); }
    if (tab === 'archive') { where.push('b.is_deleted = 1'); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.description, b.stage, b.source, b.thumbnail_url,
              b.is_template, b.is_gallery, b.is_deleted, b.created_at, b.updated_at,
              u.name AS creator_name, c.name AS client_name
       FROM blueprints b
       JOIN  users u ON u.id = b.creator_id
       LEFT JOIN users c ON c.id = b.client_id
       ${whereSQL}
       ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM blueprints b ${whereSQL}`, params
    );

    res.json({ rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/blueprints/:id ───────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [[bp]] = await pool.query(
      `SELECT b.*, u.name AS creator_name, c.name AS client_name
       FROM blueprints b
       JOIN  users u ON u.id = b.creator_id
       LEFT JOIN users c ON c.id = b.client_id
       WHERE b.id = ?`, [req.params.id]
    );
    if (!bp) return res.status(404).json({ message: 'Blueprint not found.' });

    const [components] = await pool.query('SELECT * FROM blueprint_components WHERE blueprint_id = ?', [req.params.id]);
    const [revisions]  = await pool.query(
      `SELECT br.*, u.name AS revised_by_name FROM blueprint_revisions br
       LEFT JOIN users u ON u.id = br.revised_by
       WHERE br.blueprint_id = ? ORDER BY br.revision_number DESC`, [req.params.id]
    );

    res.json({ ...bp, components, revision_history: revisions });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/blueprints ──────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { title, description, client_id, is_template, is_gallery } = req.body;
    const source   = req.file ? 'imported' : 'created';
    const file_url = req.file ? `/uploads/blueprints/${req.file.filename}` : null;
    const file_type= req.file ? req.file.originalname.split('.').pop().toLowerCase() : null;

    const [r] = await pool.query(
      `INSERT INTO blueprints (title, description, creator_id, client_id, source, file_url, file_type, is_template, is_gallery)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [title, description, req.user.id, client_id || null, source, file_url, file_type, is_template ? 1 : 0, is_gallery ? 1 : 0]
    );
    res.status(201).json({ message: 'Blueprint created.', id: r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PUT /api/blueprints/:id ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const [[bp]] = await pool.query('SELECT * FROM blueprints WHERE id = ?', [req.params.id]);
    if (!bp) return res.status(404).json({ message: 'Blueprint not found.' });

    const locked = JSON.parse(bp.locked_fields || '[]');
    const updates = { ...req.body };
    locked.forEach(f => delete updates[f]);

    const allowedCols = ['title','description','stage','design_data','view_3d_data','locked_fields',
                         'thumbnail_url','is_template','is_gallery','client_id'];
    const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowedCols.includes(k)));

    if (!Object.keys(filtered).length) return res.status(400).json({ message: 'No updatable fields.' });

    // Save revision snapshot when design_data changes
    if (filtered.design_data) {
      const [[{ maxRev }]] = await pool.query(
        'SELECT COALESCE(MAX(revision_number),0) AS maxRev FROM blueprint_revisions WHERE blueprint_id = ?', [req.params.id]
      );
      await pool.query(
        'INSERT INTO blueprint_revisions (blueprint_id, revision_number, stage_at_save, revision_data, revised_by) VALUES (?,?,?,?,?)',
        [req.params.id, maxRev + 1, bp.stage, bp.design_data, req.user.id]
      );
    }

    const sets = Object.keys(filtered).map(k => `${k} = ?`).join(', ');
    await pool.query(`UPDATE blueprints SET ${sets} WHERE id = ?`, [...Object.values(filtered), req.params.id]);
    res.json({ message: 'Blueprint updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── DELETE /api/blueprints/:id (soft delete → archive) ───────────────────────
exports.archive = async (req, res) => {
  try {
    await pool.query("UPDATE blueprints SET is_deleted = 1, stage = 'archived' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Blueprint archived.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PATCH /api/blueprints/:id/restore ────────────────────────────────────────
exports.restore = async (req, res) => {
  try {
    await pool.query("UPDATE blueprints SET is_deleted = 0 WHERE id = ?", [req.params.id]);
    res.json({ message: 'Blueprint restored.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/blueprints/:id/estimation ───────────────────────────────────────
exports.getEstimation = async (req, res) => {
  try {
    const [[est]] = await pool.query(
      `SELECT e.*, ei_agg.items FROM estimations e
       LEFT JOIN (
         SELECT estimation_id, JSON_ARRAYAGG(
           JSON_OBJECT('id',ei.id,'description',ei.description,'quantity',ei.quantity,
                       'unit_cost',ei.unit_cost,'subtotal',ei.subtotal)
         ) AS items
         FROM estimation_items ei GROUP BY estimation_id
       ) ei_agg ON ei_agg.estimation_id = e.id
       WHERE e.blueprint_id = ? ORDER BY e.version DESC LIMIT 1`, [req.params.id]
    );
    if (!est) return res.status(404).json({ message: 'No estimation yet.' });

    // Parse estimation_data for line items if exists
    if (est.estimation_data) {
      try { est.items = JSON.parse(est.estimation_data).items || est.items; } catch {}
    }
    res.json(est);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/blueprints/:id/estimation ──────────────────────────────────────
exports.saveEstimation = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { items = [], labor_cost, overhead_cost, tax_rate, discount, notes, grand_total, items_total } = req.body;

    // Check existing estimation
    const [[existing]] = await conn.query(
      'SELECT id, version FROM estimations WHERE blueprint_id = ? ORDER BY version DESC LIMIT 1', [req.params.id]
    );

    const version      = existing ? existing.version + 1 : 1;
    const material_cost = parseFloat(items_total) || 0;
    const laborCost    = parseFloat(labor_cost)    || 0;
    const taxAmt       = parseFloat(grand_total)   - (material_cost + laborCost + parseFloat(overhead_cost || 0) - parseFloat(discount || 0));

    // Store full payload in estimation_data JSON
    const estimation_data = JSON.stringify({ items, labor_cost, overhead_cost, tax_rate, discount, notes });

    const [r] = await conn.query(
      `INSERT INTO estimations
         (blueprint_id, version, material_cost, labor_cost, tax, discount, grand_total, estimation_data, status)
       VALUES (?,?,?,?,?,?,?,?,'draft')`,
      [req.params.id, version, material_cost, laborCost, taxAmt, parseFloat(discount)||0, parseFloat(grand_total)||0, estimation_data]
    );

    // Insert line items into estimation_items
    for (const item of items) {
      if (!item.name && !item.description) continue;
      await conn.query(
        'INSERT INTO estimation_items (estimation_id, description, quantity, unit_cost) VALUES (?,?,?,?)',
        [r.insertId, item.name || item.description, item.quantity, item.unit_cost]
      );
    }

    // Advance blueprint stage to 'estimation'
    await conn.query(
      "UPDATE blueprints SET stage = 'estimation' WHERE id = ? AND stage = 'design'",
      [req.params.id]
    );

    await conn.commit();
    res.status(201).json({ message: 'Estimation saved.', id: r.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally { conn.release(); }
};
