const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── Public ────────────────────────────────────────────────────────────────────

// GET /api/menu  — full menu grouped by category
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM menu_categories ORDER BY orden').all();
  const items      = db.prepare('SELECT * FROM menu_items WHERE activo=1 ORDER BY orden').all();

  const menu = categories.map(cat => ({
    ...cat,
    items: items
      .filter(i => i.category_id === cat.id)
      .map(i => ({
        ...i,
        precios: i.precios_json ? JSON.parse(i.precios_json) : null,
        precios_json: undefined,
      })),
  }));
  res.json(menu);
});

// GET /api/menu/categories
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM menu_categories ORDER BY orden').all());
});

// ── Admin-only ────────────────────────────────────────────────────────────────

// POST /api/menu/categories
router.post('/categories', requireAuth, (req, res) => {
  const { slug, nombre, orden = 0 } = req.body;
  if (!slug || !nombre) return res.status(400).json({ error: 'slug y nombre requeridos' });
  const result = db.prepare('INSERT INTO menu_categories (slug, nombre, orden) VALUES (?,?,?)').run(slug, nombre, orden);
  res.status(201).json(db.prepare('SELECT * FROM menu_categories WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/menu/categories/:id
router.put('/categories/:id', requireAuth, (req, res) => {
  const { nombre, orden } = req.body;
  db.prepare('UPDATE menu_categories SET nombre=?, orden=? WHERE id=?').run(nombre, orden, req.params.id);
  res.json(db.prepare('SELECT * FROM menu_categories WHERE id=?').get(req.params.id));
});

// DELETE /api/menu/categories/:id
router.delete('/categories/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM menu_categories WHERE id=?').run(req.params.id);
  res.json({ message: 'Categoría eliminada' });
});

// POST /api/menu/items
router.post('/items', requireAuth, (req, res) => {
  const { category_id, nombre, descripcion='', nota='', precio=null, precios=null, orden=0 } = req.body;
  if (!category_id || !nombre) return res.status(400).json({ error: 'category_id y nombre requeridos' });
  const result = db.prepare(`
    INSERT INTO menu_items (category_id, nombre, descripcion, nota, precio, precios_json, orden)
    VALUES (?,?,?,?,?,?,?)
  `).run(category_id, nombre, descripcion, nota, precio, precios ? JSON.stringify(precios) : null, orden);
  res.status(201).json(db.prepare('SELECT * FROM menu_items WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/menu/items/:id
router.put('/items/:id', requireAuth, (req, res) => {
  const { nombre, descripcion='', nota='', precio=null, precios=null, activo=1, orden=0 } = req.body;
  db.prepare(`
    UPDATE menu_items SET nombre=?, descripcion=?, nota=?, precio=?, precios_json=?, activo=?, orden=?
    WHERE id=?
  `).run(nombre, descripcion, nota, precio, precios ? JSON.stringify(precios) : null, activo ? 1 : 0, orden, req.params.id);
  res.json(db.prepare('SELECT * FROM menu_items WHERE id=?').get(req.params.id));
});

// DELETE /api/menu/items/:id
router.delete('/items/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id=?').run(req.params.id);
  res.json({ message: 'Plato eliminado' });
});

// PATCH /api/menu/items/:id/toggle  — activate / deactivate
router.patch('/items/:id/toggle', requireAuth, (req, res) => {
  const item = db.prepare('SELECT activo FROM menu_items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Plato no encontrado' });
  db.prepare('UPDATE menu_items SET activo=? WHERE id=?').run(item.activo ? 0 : 1, req.params.id);
  res.json(db.prepare('SELECT * FROM menu_items WHERE id=?').get(req.params.id));
});

module.exports = router;
