const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { notifyNewReservation } = require('../mailer');

router.post('/', async (req, res) => {
  const { nombre, telefono, fecha, hora, personas, ocasion = '', notas = '' } = req.body;
  if (!nombre || !telefono || !fecha || !hora || !personas)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const result = await pool.query(
    'INSERT INTO reservations (nombre, telefono, fecha, hora, personas, ocasion, notas) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [nombre, telefono, fecha, hora, personas, ocasion, notas]
  );
  const reservation = result.rows[0];
  notifyNewReservation(reservation).catch(err => console.error('Email error:', err));
  res.status(201).json(reservation);
});

router.get('/', requireAuth, async (req, res) => {
  const { estado, fecha, search } = req.query;
  let sql = 'SELECT * FROM reservations WHERE 1=1';
  const params = [];
  let i = 1;
  if (estado) { sql += ` AND estado = $${i++}`; params.push(estado); }
  if (fecha)  { sql += ` AND fecha = $${i++}`;  params.push(fecha); }
  if (search) {
    sql += ` AND (nombre ILIKE $${i} OR telefono ILIKE $${i+1})`;
    params.push(`%${search}%`, `%${search}%`); i += 2;
  }
  sql += ' ORDER BY fecha ASC, hora ASC';
  const result = await pool.query(sql, params);
  res.json(result.rows);
});

router.get('/stats', requireAuth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const total      = (await pool.query('SELECT COUNT(*) as n FROM reservations')).rows[0].n;
  const pendiente  = (await pool.query("SELECT COUNT(*) as n FROM reservations WHERE estado='pendiente'")).rows[0].n;
  const confirmada = (await pool.query("SELECT COUNT(*) as n FROM reservations WHERE estado='confirmada'")).rows[0].n;
  const cancelada  = (await pool.query("SELECT COUNT(*) as n FROM reservations WHERE estado='cancelada'")).rows[0].n;
  const hoy        = (await pool.query('SELECT COUNT(*) as n FROM reservations WHERE fecha=$1', [today])).rows[0].n;
  res.json({ total, pendiente, confirmada, cancelada, hoy });
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM reservations WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(result.rows[0]);
});

router.patch('/:id/estado', requireAuth, async (req, res) => {
  const { estado } = req.body;
  if (!['pendiente','confirmada','cancelada'].includes(estado))
    return res.status(400).json({ error: 'Estado invalido' });
  const result = await pool.query('UPDATE reservations SET estado=$1 WHERE id=$2 RETURNING *', [estado, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(result.rows[0]);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { nombre, telefono, fecha, hora, personas, ocasion, notas, estado } = req.body;
  const result = await pool.query(
    'UPDATE reservations SET nombre=$1,telefono=$2,fecha=$3,hora=$4,personas=$5,ocasion=$6,notas=$7,estado=$8 WHERE id=$9 RETURNING *',
    [nombre, telefono, fecha, hora, personas, ocasion||'', notas||'', estado||'pendiente', req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const result = await pool.query('DELETE FROM reservations WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json({ message: 'Reserva eliminada' });
});

module.exports = router;