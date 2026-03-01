const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const categories = (await pool.query('SELECT * FROM menu_categories ORDER BY orden')).rows;
  const items      = (await pool.query('SELECT * FROM menu_items WHERE activo=1 ORDER BY orden')).rows;
  const menu = categories.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id).map(i => ({
      ...i,
      precios: i.precios_json ? JSON.parse(i.precios_json) : null,
      precios_json: undefined,
    })),
  }));
  res.json(menu);
});

router.get('/categories', async (req, res) => {
  const result = await pool.query('SELECT * FROM menu_categories ORDER BY orden');
  res.json(result.rows);
});

router.post('/categories', requireAuth, async (req, res) => {
  const { slug, nombre, orden = 0 } = req.body;
  if (!slug || !nombre) return res.status(400).json({ error: 'slug y nombre requeridos' });
  const result = await pool.query('INSERT INTO menu_categories (slug, nombre, orden) VALUES ($1,$2,$3) RETURNING *', [slug, nombre, orden]);
  res.status(201).json(result.rows[0]);
});

router.put('/categories/:id', requireAuth, async (req, res) => {
  const { nombre, orden } = req.body;
  const result = await pool.query('UPDATE menu_categories SET nombre=$1, orden=$2 WHERE id=$3 RETURNING *', [nombre, orden, req.params.id]);
  res.json(result.rows[0]);
});

router.delete('/categories/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM menu_categories WHERE id=$1', [req.params.id]);
  res.json({ message: 'Categoria eliminada' });
});

router.post('/items', requireAuth, async (req, res) => {
  const { category_id, nombre, descripcion='', nota='', precio=null, precios=null, orden=0 } = req.body;
  if (!category_id || !nombre) return res.status(400).json({ error: 'category_id y nombre requeridos' });
  const result = await pool.query(
    'INSERT INTO menu_items (category_id,nombre,descripcion,nota,precio,precios_json,orden) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [category_id, nombre, descripcion, nota, precio, precios ? JSON.stringify(precios) : null, orden]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/items/:id', requireAuth, async (req, res) => {
  const { nombre, descripcion='', nota='', precio=null, precios=null, activo=1, orden=0 } = req.body;
  const result = await pool.query(
    'UPDATE menu_items SET nombre=$1,descripcion=$2,nota=$3,precio=$4,precios_json=$5,activo=$6,orden=$7 WHERE id=$8 RETURNING *',
    [nombre, descripcion, nota, precio, precios ? JSON.stringify(precios) : null, activo ? 1 : 0, orden, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/items/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM menu_items WHERE id=$1', [req.params.id]);
  res.json({ message: 'Plato eliminado' });
});

router.patch('/items/:id/toggle', requireAuth, async (req, res) => {
  const item = (await pool.query('SELECT activo FROM menu_items WHERE id=$1', [req.params.id])).rows[0];
  if (!item) return res.status(404).json({ error: 'Plato no encontrado' });
  const result = await pool.query('UPDATE menu_items SET activo=$1 WHERE id=$2 RETURNING *', [item.activo ? 0 : 1, req.params.id]);
  res.json(result.rows[0]);
});

module.exports = router;