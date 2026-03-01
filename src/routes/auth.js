const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
  const admin = result.rows[0];
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = signToken({ id: admin.id, username: admin.username });
  res.json({ token, username: admin.username });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.admin.id, username: req.admin.username });
});

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Faltan campos' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  const result = await pool.query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
  const admin = result.rows[0];
  if (!bcrypt.compareSync(currentPassword, admin.password))
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await pool.query('UPDATE admins SET password = $1 WHERE id = $2', [hash, req.admin.id]);
  res.json({ message: 'Contraseña actualizada' });
});

module.exports = router;
