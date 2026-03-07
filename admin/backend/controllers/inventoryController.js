// controllers/inventoryController.js – Raw Materials, Build Materials, Stock Movement
const pool = require('../config/db');

// ═══════════════════════════════════════════════════════════
// RAW MATERIALS
// ═══════════════════════════════════════════════════════════

exports.getRawMaterials = async (req, res) => {
  try {
    const { search, status, supplier_id, category_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where  = ['1=1']; const params = [];

    if (search)      { where.push('(rm.name LIKE ?)');    params.push(`%${search}%`); }
    if (status)      { where.push('rm.stock_status = ?'); params.push(status); }
    if (supplier_id) { where.push('rm.supplier_id = ?');  params.push(supplier_id); }
    if (category_id) { where.push('rm.category_id = ?');  params.push(category_id); }

    const [rows] = await pool.query(
      `SELECT rm.*, s.name AS supplier_name, c.name AS category_name
       FROM raw_materials rm
       LEFT JOIN suppliers s  ON s.id  = rm.supplier_id
       LEFT JOIN categories c ON c.id  = rm.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY rm.name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (page - 1) * parseInt(limit)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM raw_materials rm WHERE ${where.join(' AND ')}`, params
    );

    res.json({ rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createRawMaterial = async (req, res) => {
  try {
    const { name, category_id, unit, quantity = 0, reorder_point = 0, unit_cost = 0, supplier_id } = req.body;
    const status = quantity <= 0 ? 'out_of_stock' : quantity <= reorder_point ? 'low_stock' : 'in_stock';

    const [r] = await pool.query(
      `INSERT INTO raw_materials
         (name, category_id, unit, quantity, reorder_point, unit_cost, supplier_id, stock_status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [name, category_id, unit, quantity, reorder_point, unit_cost, supplier_id, status]
    );
    res.status(201).json({ message: 'Raw material created.', id: r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateRawMaterial = async (req, res) => {
  try {
    const { name, category_id, unit, quantity, reorder_point, unit_cost, supplier_id } = req.body;
    const status = quantity <= 0 ? 'out_of_stock' : quantity <= reorder_point ? 'low_stock' : 'in_stock';

    await pool.query(
      `UPDATE raw_materials SET name=?,category_id=?,unit=?,quantity=?,
         reorder_point=?,unit_cost=?,supplier_id=?,stock_status=?
       WHERE id=?`,
      [name, category_id, unit, quantity, reorder_point, unit_cost, supplier_id, status, req.params.id]
    );
    res.json({ message: 'Raw material updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteRawMaterial = async (req, res) => {
  try {
    await pool.query('DELETE FROM raw_materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Raw material deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ═══════════════════════════════════════════════════════════
// STOCK MOVEMENTS
// ═══════════════════════════════════════════════════════════

exports.getStockMovements = async (req, res) => {
  try {
    const { type, from, to, product_id, material_id, page = 1, limit = 30 } = req.query;
    const where = ['1=1']; const params = [];

    if (type)        { where.push('sm.type = ?');            params.push(type); }
    if (product_id)  { where.push('sm.product_id = ?');      params.push(product_id); }
    if (material_id) { where.push('sm.material_id = ?');     params.push(material_id); }
    if (from && to)  { where.push('DATE(sm.created_at) BETWEEN ? AND ?'); params.push(from, to); }

    const [rows] = await pool.query(
      `SELECT sm.*, u.name AS created_by_name,
              rm.name AS material_name, p.name AS product_name,
              s.name AS supplier_name
       FROM stock_movements sm
       LEFT JOIN users u         ON u.id  = sm.created_by
       LEFT JOIN raw_materials rm ON rm.id = sm.material_id
       LEFT JOIN products p       ON p.id  = sm.product_id
       LEFT JOIN suppliers s      ON s.id  = sm.supplier_id
       WHERE ${where.join(' AND ')}
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), (page - 1) * parseInt(limit)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM stock_movements sm WHERE ${where.join(' AND ')}`, params
    );

    res.json({ rows, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createStockMovement = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      material_id, product_id, type, quantity,
      supplier_id, order_id, reference, notes,
    } = req.body;

    const [r] = await conn.query(
      `INSERT INTO stock_movements
         (material_id, product_id, type, quantity, supplier_id,
          order_id, reference, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [material_id, product_id, type, quantity, supplier_id,
       order_id, reference, notes, req.user.id]
    );

    // Adjust stock level
    const delta = type === 'in' || type === 'return' ? quantity : -quantity;

    if (material_id) {
      await conn.query(
        'UPDATE raw_materials SET quantity = quantity + ? WHERE id = ?', [delta, material_id]
      );
      // Refresh status
      await conn.query(
        `UPDATE raw_materials SET stock_status =
           CASE WHEN quantity <= 0 THEN 'out_of_stock'
                WHEN quantity <= reorder_point THEN 'low_stock'
                ELSE 'in_stock' END
         WHERE id = ?`, [material_id]
      );
    }

    if (product_id) {
      await conn.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?', [delta, product_id]
      );
      await conn.query(
        `UPDATE products SET stock_status =
           CASE WHEN stock <= 0 THEN 'out_of_stock'
                WHEN stock <= reorder_point THEN 'low_stock'
                ELSE 'in_stock' END
         WHERE id = ?`, [product_id]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Stock movement recorded.', id: r.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════

exports.getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = search ? 'WHERE name LIKE ?' : '';
    const params = search ? [`%${search}%`] : [];
    const [rows] = await pool.query(
      `SELECT * FROM suppliers ${where} ORDER BY name ASC`, params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, address, contact_number, email } = req.body;
    const [r] = await pool.query(
      'INSERT INTO suppliers (name, address, contact_number, email) VALUES (?,?,?,?)',
      [name, address, contact_number, email]
    );
    res.status(201).json({ message: 'Supplier created.', id: r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { name, address, contact_number, email } = req.body;
    await pool.query(
      'UPDATE suppliers SET name=?,address=?,contact_number=?,email=? WHERE id=?',
      [name, address, contact_number, email, req.params.id]
    );
    res.json({ message: 'Supplier updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Supplier deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
