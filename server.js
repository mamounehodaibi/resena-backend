require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { init } = require('./src/db');
const authRoutes        = require('./src/routes/auth');
const reservationRoutes = require('./src/routes/reservations');
const menuRoutes        = require('./src/routes/menu');

init().catch(err => { console.error('DB init error:', err); process.exit(1); });

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth',         authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/menu',         menuRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', restaurant: 'La Resena' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`La Resena backend running on http://localhost:${PORT}`);
});