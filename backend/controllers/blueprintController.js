// controllers/blueprintController.js
const path = require('path');
const pool = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────────────────────
function safeJsonParse(value, fallback = {}) {
  try {
    if (value == null || value === '') return fallback;
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function normalizeEstimationItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const quantity = Number(item.quantity) || 1;
      const unitCost = Number(item.unit_cost) || 0;
      const subtotal =
        item.subtotal != null
          ? Number(item.subtotal) || 0
          : quantity * unitCost;

      return {
        id: item.id || index + 1,
        name: item.name || item.description || '',
        description: item.description || item.name || '',
        quantity,
        unit: item.unit || 'pc',
        unit_cost: unitCost,
        note: item.note || '',
        subtotal,
      };
    })
    .filter((item) => item.name.trim() !== '');
}

function computeEstimationTotals({
  items = [],
  labor_cost = 0,
  overhead_cost = 0,
  tax_rate = 12,
  discount = 0,
}) {
  const material_cost = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0
  );

  const laborCost = Number(labor_cost) || 0;
  const overheadCost = Number(overhead_cost) || 0;
  const discountAmt = Number(discount) || 0;
  const taxRate = Number(tax_rate) || 0;

  const subtotal = material_cost + laborCost + overheadCost;
  const afterDiscount = subtotal - discountAmt;
  const tax_amount = afterDiscount * (taxRate / 100);
  const grand_total = afterDiscount + tax_amount;

  return {
    material_cost,
    items_total: material_cost,
    labor_cost: laborCost,
    overhead_cost: overheadCost,
    tax_rate: taxRate,
    discount: discountAmt,
    subtotal,
    tax_amount,
    grand_total,
  };
}

function getBlueprintFileMeta(file) {
  if (!file) {
    return {
      source: null,
      file_url: null,
      file_type: null,
      default_thumbnail_url: null,
    };
  }

  const ext = path.extname(file.originalname || '')
    .replace('.', '')
    .toLowerCase();

  const allowed = new Set(['pdf', 'png', 'jpg', 'jpeg', 'svg']);

  if (!allowed.has(ext)) {
    const err = new Error('Only PDF, PNG, JPG, JPEG, and SVG blueprint files are allowed.');
    err.statusCode = 400;
    throw err;
  }

  const file_url = `/uploads/blueprints/${file.filename}`;
  const default_thumbnail_url = ['png', 'jpg', 'jpeg', 'svg'].includes(ext) ? file_url : null;

  return {
    source: 'imported',
    file_url,
    file_type: ext,
    default_thumbnail_url,
  };
}

const REFERENCE_VIEWS = ['front', 'back', 'left', 'right', 'top'];

function createEmptyReferenceFiles() {
  return {
    front: null,
    back: null,
    left: null,
    right: null,
    top: null,
  };
}

function normalizeReferenceFilesMap(value = {}, fallbackTitle = '') {
  const next = createEmptyReferenceFiles();

  REFERENCE_VIEWS.forEach((view) => {
    const normalized = normalizeReferenceFile(
      value?.[view],
      fallbackTitle ? `${fallbackTitle} ${view}` : `${view} reference`
    );

    if (normalized) {
      next[view] = normalized;
    }
  });

  return next;
}

function buildUploadedReferenceFiles(uploadedFiles = {}, fallbackTitle = '') {
  const next = createEmptyReferenceFiles();

  REFERENCE_VIEWS.forEach((view) => {
    const file = uploadedFiles?.[view];
    if (!file) return;

    const meta = getBlueprintFileMeta(file);

    next[view] = normalizeReferenceFile(
      {
        url: meta.file_url,
        type: meta.file_type,
        name: file.originalname || `${fallbackTitle || 'Reference'} ${view}`,
        source: 'imported',
      },
      fallbackTitle ? `${fallbackTitle} ${view}` : `${view} reference`
    );
  });

  return next;
}

function hasAnyReferenceFiles(referenceFiles = {}) {
  return REFERENCE_VIEWS.some((view) => referenceFiles?.[view]?.url);
}


function normalizeReferenceFile(value, fallbackTitle = '') {
  const url = value?.url || value?.file_url || null;
  const type = String(value?.type || value?.file_type || '')
    .trim()
    .toLowerCase();

  if (!url || !type) return null;

  return {
    url,
    type,
    name: value?.name || (fallbackTitle ? `${fallbackTitle}.${type}` : path.basename(url)),
    source: 'imported',
  };
}

function mergeDesignData(value, blueprintLike = {}, fallbackTitle = '') {
  const base = safeJsonParse(value, {});
  const designData =
    base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};

  if (!Array.isArray(designData.components)) designData.components = [];
  if (!designData.unit) designData.unit = 'mm';

  const existingReferenceFiles = normalizeReferenceFilesMap(
    designData.reference_files || designData.referenceFiles,
    fallbackTitle
  );

  const incomingReferenceFiles = normalizeReferenceFilesMap(
    blueprintLike.reference_files || blueprintLike.referenceFiles,
    fallbackTitle
  );

  const existingReference = normalizeReferenceFile(
    designData.reference_file || designData.referenceFile,
    fallbackTitle
  );

  const blueprintReference = normalizeReferenceFile(blueprintLike, fallbackTitle);

  const finalReferenceFiles = createEmptyReferenceFiles();

  REFERENCE_VIEWS.forEach((view) => {
    finalReferenceFiles[view] =
      incomingReferenceFiles[view] ||
      existingReferenceFiles[view] ||
      null;
  });

  if (!finalReferenceFiles.front) {
    finalReferenceFiles.front = blueprintReference || existingReference || null;
  }

  if (hasAnyReferenceFiles(finalReferenceFiles)) {
    designData.reference_files = finalReferenceFiles;
    designData.reference_file = finalReferenceFiles.front || null;
  } else {
    delete designData.reference_files;
    delete designData.reference_file;
  }

  delete designData.referenceFiles;
  delete designData.referenceFile;

  return JSON.stringify(designData);
}

function normalizeSource(sourceValue, hasFile = false) {
  if (hasFile) return 'imported';

  const value = String(sourceValue || '').trim().toLowerCase();

  if (value === 'imported') return 'imported';
  if (value === 'manual') return 'created';
  if (value === 'created') return 'created';

  return 'created';
}

async function backfillLegacyArchivedDates() {
  await pool.query(
    `UPDATE blueprints
     SET archived_at = COALESCE(updated_at, created_at, NOW())
     WHERE is_deleted = 1
       AND archived_at IS NULL`
  );
}

async function deleteBlueprintCascade(conn, blueprintIds = []) {
  if (!Array.isArray(blueprintIds) || !blueprintIds.length) return;

  const bpPlaceholders = blueprintIds.map(() => '?').join(',');

  const [estimationRows] = await conn.query(
    `SELECT id
     FROM estimations
     WHERE blueprint_id IN (${bpPlaceholders})`,
    blueprintIds
  );

  const estimationIds = estimationRows.map((row) => row.id);

  if (estimationIds.length) {
    const estPlaceholders = estimationIds.map(() => '?').join(',');

    await conn.query(
      `DELETE FROM estimation_items
       WHERE estimation_id IN (${estPlaceholders})`,
      estimationIds
    );
  }

  await conn.query(
    `DELETE FROM blueprint_revisions
     WHERE blueprint_id IN (${bpPlaceholders})`,
    blueprintIds
  );

  await conn.query(
    `DELETE FROM blueprint_components
     WHERE blueprint_id IN (${bpPlaceholders})`,
    blueprintIds
  );

  await conn.query(
    `DELETE FROM estimations
     WHERE blueprint_id IN (${bpPlaceholders})`,
    blueprintIds
  );

  await conn.query(
    `DELETE FROM blueprints
     WHERE id IN (${bpPlaceholders})`,
    blueprintIds
  );
}

async function purgeExpiredArchivedBlueprints() {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [expiredRows] = await conn.query(
      `SELECT b.id
       FROM blueprints b
       LEFT JOIN orders o ON o.blueprint_id = b.id
       WHERE b.is_deleted = 1
         AND COALESCE(b.archived_at, b.updated_at, b.created_at) IS NOT NULL
         AND DATEDIFF(CURDATE(), DATE(COALESCE(b.archived_at, b.updated_at, b.created_at))) >= 30
         AND o.id IS NULL
       GROUP BY b.id`
    );

    if (!expiredRows.length) {
      await conn.commit();
      return;
    }

    const blueprintIds = expiredRows.map((row) => row.id);

    await deleteBlueprintCascade(conn, blueprintIds);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── GET /api/blueprints ───────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    await backfillLegacyArchivedDates();
    await purgeExpiredArchivedBlueprints();

    const {
      tab = 'my',
      page = 1,
      limit = 20,
      search = '',
    } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const params = [];

    if (tab === 'my') {
      where.push('b.creator_id = ? AND b.is_deleted = 0');
      params.push(req.user.id);
    }

    if (tab === 'imports') {
      where.push('b.source = "imported" AND b.is_deleted = 0');
    }

    if (tab === 'gallery') {
      where.push('(b.is_template = 1 OR b.is_gallery = 1) AND b.is_deleted = 0');
    }

    if (tab === 'archive') {
      where.push('b.is_deleted = 1');
    }

    if (String(search).trim()) {
      const keyword = `%${String(search).trim()}%`;
      where.push(`(
        b.title LIKE ?
        OR COALESCE(b.description, '') LIKE ?
        OR COALESCE(u.name, '') LIKE ?
        OR COALESCE(c.name, '') LIKE ?
        OR COALESCE(b.file_type, '') LIKE ?
      )`);
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const baseFrom = `
      FROM blueprints b
      JOIN users u ON u.id = b.creator_id
      LEFT JOIN users c ON c.id = b.client_id
    `;

    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.description, b.stage, b.source,
              b.file_url, b.file_type, b.thumbnail_url,
              b.is_template, b.is_gallery, b.is_deleted, b.archived_at,
              b.created_at, b.updated_at,
              u.name AS creator_name,
              c.name AS client_name,
              CASE
                WHEN b.is_deleted = 1
                  THEN GREATEST(0, 30 - DATEDIFF(CURDATE(), DATE(COALESCE(b.archived_at, b.updated_at, b.created_at))))
                ELSE NULL
              END AS archive_days_left,
              CASE
                WHEN b.is_deleted = 1
                  THEN DATE_ADD(DATE(COALESCE(b.archived_at, b.updated_at, b.created_at)), INTERVAL 30 DAY)
                ELSE NULL
              END AS archive_expires_at
       ${baseFrom}
       ${whereSQL}
       ORDER BY
         CASE
           WHEN b.is_deleted = 1 THEN COALESCE(b.archived_at, b.updated_at, b.created_at)
           ELSE b.updated_at
         END DESC,
         b.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       ${baseFrom}
       ${whereSQL}`,
      params
    );

    res.json({ rows, total });
  } catch (err) {
    console.error('getAll blueprints error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── GET /api/blueprints/:id ───────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [[bp]] = await pool.query(
      `SELECT b.*, u.name AS creator_name, c.name AS client_name,
              CASE
                WHEN b.is_deleted = 1
                  THEN GREATEST(0, 30 - DATEDIFF(CURDATE(), DATE(COALESCE(b.archived_at, b.updated_at, b.created_at))))
                ELSE NULL
              END AS archive_days_left,
              CASE
                WHEN b.is_deleted = 1
                  THEN DATE_ADD(DATE(COALESCE(b.archived_at, b.updated_at, b.created_at)), INTERVAL 30 DAY)
                ELSE NULL
              END AS archive_expires_at
       FROM blueprints b
       JOIN users u ON u.id = b.creator_id
       LEFT JOIN users c ON c.id = b.client_id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (!bp) {
      return res.status(404).json({ message: 'Blueprint not found.' });
    }

    const [components] = await pool.query(
      'SELECT * FROM blueprint_components WHERE blueprint_id = ?',
      [req.params.id]
    );

    const [revisions] = await pool.query(
      `SELECT br.*, u.name AS revised_by_name
       FROM blueprint_revisions br
       LEFT JOIN users u ON u.id = br.revised_by
       WHERE br.blueprint_id = ?
       ORDER BY br.revision_number DESC`,
      [req.params.id]
    );

    const normalizedDesignData = mergeDesignData(bp.design_data, bp, bp.title);

    res.json({
      ...bp,
      design_data: normalizedDesignData,
      components,
      revision_history: revisions,
    });
  } catch (err) {
    console.error('getOne blueprint error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── POST /api/blueprints ──────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      title,
      description,
      client_id,
      is_template,
      is_gallery,
      stage,
      source,
      thumbnail_url,
      design_data,
    } = req.body;

    if (!String(title || '').trim()) {
      return res.status(400).json({ message: 'Blueprint title is required.' });
    }

    const finalTitle = String(title).trim();
    const uploadedReferenceFiles = buildUploadedReferenceFiles(req.referenceFiles, finalTitle);
    const primaryReference = uploadedReferenceFiles.front || null;
    const fileMeta = getBlueprintFileMeta(req.file);
    const normalizedSource = normalizeSource(
      source,
      !!req.file || hasAnyReferenceFiles(uploadedReferenceFiles)
    );
    const finalStage = String(stage || '').trim() || 'design';
    const finalThumbnail =
      thumbnail_url ||
      primaryReference?.url ||
      fileMeta.default_thumbnail_url ||
      null;

    const finalDesignData = mergeDesignData(
      design_data,
      {
        file_url: primaryReference?.url || fileMeta.file_url,
        file_type: primaryReference?.type || fileMeta.file_type,
        reference_files: uploadedReferenceFiles,
      },
      finalTitle
    );

    const [r] = await pool.query(
      `INSERT INTO blueprints
        (title, description, creator_id, client_id, source, stage, file_url, file_type, thumbnail_url, design_data, is_template, is_gallery, is_deleted, archived_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        finalTitle,
        description || null,
        req.user.id,
        client_id || null,
        fileMeta.source || normalizedSource,
        finalStage,
        fileMeta.file_url,
        fileMeta.file_type,
        finalThumbnail,
        finalDesignData,
        Number(is_template) ? 1 : 0,
        Number(is_gallery) ? 1 : 0,
        0,
        null,
      ]
    );

    res.status(201).json({
      message: 'Blueprint created.',
      id: r.insertId,
      blueprint: {
        id: r.insertId,
        title: finalTitle,
        source: fileMeta.source || normalizedSource,
        stage: finalStage,
        file_url: primaryReference?.url || fileMeta.file_url,
        file_type: primaryReference?.type || fileMeta.file_type,
        thumbnail_url: finalThumbnail,
        design_data: finalDesignData,
      },
    });
  } catch (err) {
    console.error('create blueprint error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── PUT /api/blueprints/:id ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const [[bp]] = await pool.query(
      'SELECT * FROM blueprints WHERE id = ?',
      [req.params.id]
    );

    if (!bp) {
      return res.status(404).json({ message: 'Blueprint not found.' });
    }

    const locked = safeJsonParse(bp.locked_fields, []);
    const updates = { ...req.body };
    const uploadedReferenceFiles = buildUploadedReferenceFiles(
      req.referenceFiles,
      bp.title || ''
    );
    const hasUploadedReferenceFiles = hasAnyReferenceFiles(uploadedReferenceFiles);
    const fileMeta = getBlueprintFileMeta(req.file);

    locked.forEach((field) => delete updates[field]);

    const allowedCols = [
      'title',
      'description',
      'stage',
      'design_data',
      'view_3d_data',
      'locked_fields',
      'thumbnail_url',
      'is_template',
      'is_gallery',
      'client_id',
      'source',
      'file_url',
      'file_type',
    ];

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedCols.includes(key))
    );

    const incomingHasDesignData = Object.prototype.hasOwnProperty.call(filtered, 'design_data');

    if (req.file) {
      filtered.source = fileMeta.source;
      filtered.file_url = fileMeta.file_url;
      filtered.file_type = fileMeta.file_type;

      if (!filtered.thumbnail_url) {
        filtered.thumbnail_url = fileMeta.default_thumbnail_url;
      }
    }

    if (filtered.source) {
      filtered.source = normalizeSource(
        filtered.source,
        !!req.file || hasUploadedReferenceFiles
      );
    }

    if (filtered.title != null && !String(filtered.title).trim()) {
      return res.status(400).json({ message: 'Blueprint title cannot be empty.' });
    }

    if (filtered.title != null) {
      filtered.title = String(filtered.title).trim();
    }

    if (incomingHasDesignData || req.file || hasUploadedReferenceFiles) {
      filtered.design_data = mergeDesignData(
        incomingHasDesignData ? filtered.design_data : bp.design_data,
        {
          file_url: filtered.file_url || bp.file_url,
          file_type: filtered.file_type || bp.file_type,
          reference_files: uploadedReferenceFiles,
        },
        filtered.title || bp.title
      );
    }

    if (!Object.keys(filtered).length) {
      return res.status(400).json({ message: 'No updatable fields.' });
    }

    if (incomingHasDesignData) {
      const [[{ maxRev }]] = await pool.query(
        `SELECT COALESCE(MAX(revision_number), 0) AS maxRev
         FROM blueprint_revisions
         WHERE blueprint_id = ?`,
        [req.params.id]
      );

      await pool.query(
        `INSERT INTO blueprint_revisions
          (blueprint_id, revision_number, stage_at_save, revision_data, revised_by)
         VALUES (?,?,?,?,?)`,
        [req.params.id, maxRev + 1, bp.stage, bp.design_data, req.user.id]
      );
    }

    const sets = Object.keys(filtered).map((key) => `${key} = ?`).join(', ');

    await pool.query(
      `UPDATE blueprints
       SET ${sets}
       WHERE id = ?`,
      [...Object.values(filtered), req.params.id]
    );

    res.json({
      message: 'Blueprint updated.',
      blueprint: {
        id: Number(req.params.id),
        ...filtered,
      },
    });
  } catch (err) {
    console.error('update blueprint error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── DELETE /api/blueprints/:id (soft delete → archive) ───────────────────────
exports.archive = async (req, res) => {
  try {
    const [[bp]] = await pool.query(
      `SELECT id
       FROM blueprints
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!bp) {
      return res.status(404).json({ message: 'Blueprint not found.' });
    }

    await pool.query(
      `UPDATE blueprints
       SET is_deleted = 1,
           stage = 'archived',
           archived_at = NOW()
       WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Blueprint archived.' });
  } catch (err) {
    console.error('archive blueprint error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── PATCH /api/blueprints/:id/restore ────────────────────────────────────────
exports.restore = async (req, res) => {
  try {
    const [[bp]] = await pool.query(
      `SELECT id, stage
       FROM blueprints
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!bp) {
      return res.status(404).json({ message: 'Blueprint not found.' });
    }

    await pool.query(
      `UPDATE blueprints
       SET is_deleted = 0,
           archived_at = NULL,
           stage = CASE
             WHEN stage = 'archived' THEN 'design'
             ELSE stage
           END
       WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Blueprint restored.' });
  } catch (err) {
    console.error('restore blueprint error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── DELETE /api/blueprints/:id/permanent ─────────────────────────────────────
exports.permanentDelete = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[bp]] = await conn.query(
      `SELECT id, is_deleted
       FROM blueprints
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!bp) {
      await conn.rollback();
      return res.status(404).json({ message: 'Blueprint not found.' });
    }

    if (Number(bp.is_deleted) !== 1) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Only archived blueprints can be permanently deleted.',
      });
    }

    const [[linkedOrder]] = await conn.query(
      `SELECT id
       FROM orders
       WHERE blueprint_id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (linkedOrder) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Cannot permanently delete blueprint linked to an order.',
      });
    }

    await deleteBlueprintCascade(conn, [Number(req.params.id)]);

    await conn.commit();

    res.json({ message: 'Blueprint permanently deleted.' });
  } catch (err) {
    await conn.rollback();
    console.error('permanentDelete blueprint error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ── GET /api/blueprints/:id/estimation ───────────────────────────────────────
exports.getEstimation = async (req, res) => {
  try {
    const [[est]] = await pool.query(
      `SELECT *
       FROM estimations
       WHERE blueprint_id = ?
       ORDER BY version DESC, id DESC
       LIMIT 1`,
      [req.params.id]
    );

    if (!est) {
      return res.status(404).json({ message: 'No estimation yet.' });
    }

    const [itemRows] = await pool.query(
      `SELECT id, estimation_id, component_id, raw_material_id, description, quantity, unit_cost, subtotal
       FROM estimation_items
       WHERE estimation_id = ?
       ORDER BY id ASC`,
      [est.id]
    );

    const meta = safeJsonParse(est.estimation_data, {});
    const dbItems = itemRows.map((row) => ({
      id: row.id,
      name: row.description || '',
      description: row.description || '',
      quantity: Number(row.quantity) || 1,
      unit: 'pc',
      unit_cost: Number(row.unit_cost) || 0,
      note: '',
      subtotal:
        row.subtotal != null
          ? Number(row.subtotal) || 0
          : (Number(row.quantity) || 0) * (Number(row.unit_cost) || 0),
    }));

    const normalizedItems = normalizeEstimationItems(
      Array.isArray(meta.items) && meta.items.length ? meta.items : dbItems
    );

    const computed = computeEstimationTotals({
      items: normalizedItems,
      labor_cost: meta.labor_cost ?? est.labor_cost ?? 0,
      overhead_cost: meta.overhead_cost ?? 0,
      tax_rate: meta.tax_rate ?? 12,
      discount: est.discount ?? meta.discount ?? 0,
    });

    const materialCostRaw = Number(est.material_cost);
    const laborCostRaw = Number(est.labor_cost);
    const taxRaw = Number(est.tax);
    const grandTotalRaw = Number(est.grand_total);
    const discountRaw = Number(est.discount);

    const material_cost = Number.isFinite(materialCostRaw)
      ? materialCostRaw
      : computed.material_cost;

    const labor_cost = Number.isFinite(laborCostRaw)
      ? laborCostRaw
      : computed.labor_cost;

    const overhead_cost = Number(meta.overhead_cost) || 0;
    const tax_rate = Number(meta.tax_rate ?? 12);
    const discount = Number.isFinite(discountRaw)
      ? discountRaw
      : computed.discount;

    const subtotal = material_cost + labor_cost + overhead_cost;

    const tax_amount = Number.isFinite(taxRaw)
      ? taxRaw
      : computed.tax_amount;

    const grand_total = Number.isFinite(grandTotalRaw)
      ? grandTotalRaw
      : computed.grand_total;

    res.json({
      ...est,
      items: normalizedItems,
      material_cost,
      items_total: material_cost,
      labor_cost,
      overhead_cost,
      tax_rate,
      discount,
      notes: meta.notes || '',
      subtotal,
      tax_amount,
      grand_total,
      created_at: est.created_at || new Date().toISOString(),
      updated_at: est.updated_at || est.created_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('getEstimation error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ── POST /api/blueprints/:id/estimation ──────────────────────────────────────
exports.saveEstimation = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[bp]] = await conn.query(
      `SELECT id, stage, is_deleted
       FROM blueprints
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!bp) {
      await conn.rollback();
      return res.status(404).json({ message: 'Blueprint not found.' });
    }

    if (Number(bp.is_deleted) === 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'Cannot save estimation for archived blueprint.' });
    }

    const {
      items = [],
      labor_cost = 0,
      overhead_cost = 0,
      tax_rate = 12,
      discount = 0,
      notes = '',
    } = req.body;

    const normalizedItems = normalizeEstimationItems(items);

    const totals = computeEstimationTotals({
      items: normalizedItems,
      labor_cost,
      overhead_cost,
      tax_rate,
      discount,
    });

    const [[existing]] = await conn.query(
      `SELECT id, version
       FROM estimations
       WHERE blueprint_id = ?
       ORDER BY version DESC, id DESC
       LIMIT 1`,
      [req.params.id]
    );

    const version = existing ? Number(existing.version || 0) + 1 : 1;

    const estimation_data = JSON.stringify({
      items: normalizedItems,
      labor_cost: totals.labor_cost,
      overhead_cost: totals.overhead_cost,
      tax_rate: totals.tax_rate,
      discount: totals.discount,
      notes,
      material_cost: totals.material_cost,
      items_total: totals.items_total,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      grand_total: totals.grand_total,
    });

    const [insertResult] = await conn.query(
      `INSERT INTO estimations
        (blueprint_id, version, material_cost, labor_cost, tax, discount, grand_total, estimation_data, status)
       VALUES (?,?,?,?,?,?,?,?,'draft')`,
      [
        req.params.id,
        version,
        totals.material_cost,
        totals.labor_cost,
        totals.tax_amount,
        totals.discount,
        totals.grand_total,
        estimation_data,
      ]
    );

    for (const item of normalizedItems) {
      await conn.query(
        `INSERT INTO estimation_items
          (estimation_id, description, quantity, unit_cost, subtotal)
         VALUES (?,?,?,?,?)`,
        [
          insertResult.insertId,
          item.name,
          item.quantity,
          item.unit_cost,
          item.subtotal,
        ]
      );
    }

    await conn.query(
      `UPDATE blueprints
       SET stage = 'estimation'
       WHERE id = ? AND is_deleted = 0`,
      [req.params.id]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Estimation saved.',
      id: insertResult.insertId,
      estimation: {
        id: insertResult.insertId,
        blueprint_id: Number(req.params.id),
        version,
        items: normalizedItems,
        material_cost: totals.material_cost,
        items_total: totals.items_total,
        labor_cost: totals.labor_cost,
        overhead_cost: totals.overhead_cost,
        tax_rate: totals.tax_rate,
        discount: totals.discount,
        notes,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        grand_total: totals.grand_total,
        status: 'draft',
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('saveEstimation error:', err);
    res.status(err.statusCode || 500).json({ message: err.message });
  } finally {
    conn.release();
  }
};