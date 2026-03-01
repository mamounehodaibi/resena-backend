require('dotenv').config();
const { init } = require('./src/db');
init().catch(err => { console.error('DB init error:', err); process.exit(1); });
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes        = require('./src/routes/auth');
const reservationRoutes = require('./src/routes/reservations');
const menuRoutes        = require('./src/routes/menu');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth',         authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/menu',         menuRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', restaurant: 'La Reseña' }));

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  La Reseña backend running on http://localhost:${PORT}`);
});

