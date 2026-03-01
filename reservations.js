const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../middleware/auth');
const { notifyNewReservation } = require('../mailer');

// ── Public ────────────────────────────────────────────────────────────────────

// POST /api/reservations  — create a new reservation (public)
router.post('/', async (req, res) => {
  const { nombre, telefono, fecha, hora, personas, ocasion = '', notas = '' } = req.body;

  if (!nombre || !telefono || !fecha || !hora || !personas)
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, telefono, fecha, hora, personas' });

  const stmt = db.prepare(`
    INSERT INTO reservations (nombre, telefono, fecha, hora, personas, ocasion, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(nombre, telefono, fecha, hora, personas, ocasion, notas);
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);

  // Fire-and-forget email notification
  notifyNewReservation(reservation).catch(err => console.error('Email error:', err));

  res.status(201).json(reservation);
});

// ── Admin-only ────────────────────────────────────────────────────────────────

// GET /api/reservations  — list all (filterable)
router.get('/', requireAuth, (req, res) => {
  const { estado, fecha, search } = req.query;
  let sql = 'SELECT * FROM reservations WHERE 1=1';
  const params = [];

  if (estado) { sql += ' AND estado = ?'; params.push(estado); }
  if (fecha)  { sql += ' AND fecha = ?';  params.push(fecha); }
  if (search) {
    sql += ' AND (nombre LIKE ? OR telefono LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY fecha ASC, hora ASC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/reservations/stats  — dashboard numbers
router.get('/stats', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const total     = db.prepare('SELECT COUNT(*) as n FROM reservations').get().n;
  const pendiente = db.prepare("SELECT COUNT(*) as n FROM reservations WHERE estado='pendiente'").get().n;
  const confirmada= db.prepare("SELECT COUNT(*) as n FROM reservations WHERE estado='confirmada'").get().n;
  const cancelada = db.prepare("SELECT COUNT(*) as n FROM reservations WHERE estado='cancelada'").get().n;
  const hoy       = db.prepare('SELECT COUNT(*) as n FROM reservations WHERE fecha=?').get(today).n;
  res.json({ total, pendiente, confirmada, cancelada, hoy });
});

// GET /api/reservations/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(row);
});

// PATCH /api/reservations/:id/estado  — confirm / cancel
router.patch('/:id/estado', requireAuth, (req, res) => {
  const { estado } = req.body;
  if (!['pendiente','confirmada','cancelada'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });

  const result = db.prepare('UPDATE reservations SET estado = ? WHERE id = ?').run(estado, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  res.json(row);
});

// PUT /api/reservations/:id  — full update
router.put('/:id', requireAuth, (req, res) => {
  const { nombre, telefono, fecha, hora, personas, ocasion, notas, estado } = req.body;
  const result = db.prepare(`
    UPDATE reservations SET nombre=?, telefono=?, fecha=?, hora=?, personas=?, ocasion=?, notas=?, estado=?
    WHERE id=?
  `).run(nombre, telefono, fecha, hora, personas, ocasion||'', notas||'', estado||'pendiente', req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id));
});

// DELETE /api/reservations/:id
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json({ message: 'Reserva eliminada' });
});

module.exports = router;
