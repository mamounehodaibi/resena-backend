/**
 * server.js
 * Main entry point — La Reseña Bar Restaurante Backend API
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static frontend files
app.use(express.static(path.join(__dirname, '../../frontend')));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/menu', require('./routes/menu'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'La Reseña API', timestamp: new Date().toISOString() });
});

// Catch-all: serve the frontend for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │   La Reseña API — running on :${PORT}     │
  │   http://localhost:${PORT}/api/health      │
  └─────────────────────────────────────────┘
  `);
});

module.exports = app;
