/**
 * db/database.js
 * Initialises the SQLite database and creates all tables on first run.
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/resena.db');

// Ensure the data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  -- Admin users
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Reservations
  CREATE TABLE IF NOT EXISTS reservations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    telefono    TEXT    NOT NULL,
    fecha       TEXT    NOT NULL,   -- YYYY-MM-DD
    hora        TEXT    NOT NULL,   -- HH:MM
    personas    TEXT    NOT NULL,
    ocasion     TEXT,
    notas       TEXT,
    estado      TEXT    NOT NULL DEFAULT 'pendiente'
                CHECK(estado IN ('pendiente','confirmada','cancelada')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Menu categories
  CREATE TABLE IF NOT EXISTS menu_categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    slug      TEXT    NOT NULL UNIQUE,
    nombre    TEXT    NOT NULL,
    orden     INTEGER NOT NULL DEFAULT 0,
    activa    INTEGER NOT NULL DEFAULT 1
  );

  -- Menu items
  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    nombre      TEXT    NOT NULL,
    descripcion TEXT,
    nota        TEXT,                   -- e.g. "★ Reserva con un día de antelación"
    precio      REAL,                   -- NULL when item has size variants
    activo      INTEGER NOT NULL DEFAULT 1,
    orden       INTEGER NOT NULL DEFAULT 0
  );

  -- Size / price variants for menu items (Entera / Media / Tapa)
  CREATE TABLE IF NOT EXISTS menu_variants (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id  INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    tamano   TEXT    NOT NULL,          -- "Entera", "Media", "Tapa"
    precio   REAL    NOT NULL,
    orden    INTEGER NOT NULL DEFAULT 0
  );
`);

// ─── Seed default admin ───────────────────────────────────────────────────────

const seedAdmin = db.prepare(`
  INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)
`);

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'resena2025';
const hashedPassword = bcrypt.hashSync(adminPassword, 12);
seedAdmin.run(adminUsername, hashedPassword);

// ─── Seed menu from the original HTML ────────────────────────────────────────

const categoryCount = db.prepare('SELECT COUNT(*) as c FROM menu_categories').get().c;

if (categoryCount === 0) {
  const insertCategory = db.prepare(
    'INSERT INTO menu_categories (slug, nombre, orden) VALUES (?, ?, ?)'
  );
  const insertItem = db.prepare(`
    INSERT INTO menu_items (category_id, nombre, descripcion, nota, precio, orden)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO menu_variants (item_id, tamano, precio, orden)
    VALUES (?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    // ── Entrantes ──
    const entrantesId = insertCategory.run('entrantes', 'Entrantes', 1).lastInsertRowid;
    insertItem.run(entrantesId, 'Ensalada de Burrata', 'Con tomate ecológico, salsa de mango, albahaca', null, 8.90, 1);
    insertItem.run(entrantesId, 'Ensalada de Ventresca', 'Tomate ecológico, ventresca, aguacate', null, 13.50, 2);
    insertItem.run(entrantesId, 'Tosta de Anchoas', 'Con queso de cabra y cebolla caramelizada', null, 6.00, 3);
    insertItem.run(entrantesId, 'Tosta de Burrata', 'Con salsa de naranja', null, 7.00, 4);
    insertItem.run(entrantesId, 'Tabla La Reseña', 'Jamón ibérico, queso curado, salmorejo', null, 14.50, 5);

    const gamba = insertItem.run(entrantesId, 'Ensaladilla de Gamba', null, null, null, 6).lastInsertRowid;
    insertVariant.run(gamba, 'Entera', 12.00, 1);
    insertVariant.run(gamba, 'Media', 7.50, 2);
    insertVariant.run(gamba, 'Tapa', 4.50, 3);

    const salmon = insertItem.run(entrantesId, 'Ensaladilla de Salmón Ahumado', 'Salmón ahumado, alcaparras, maïs, pepinillo', null, null, 7).lastInsertRowid;
    insertVariant.run(salmon, 'Entera', 13.50, 1);
    insertVariant.run(salmon, 'Media', 8.50, 2);
    insertVariant.run(salmon, 'Tapa', 5.50, 3);

    const mazamorra = insertItem.run(entrantesId, 'Mazamorra', 'Con almendras y leche de almendras', null, null, 8).lastInsertRowid;
    insertVariant.run(mazamorra, 'Entera', 10.50, 1);
    insertVariant.run(mazamorra, 'Media', 8.30, 2);
    insertVariant.run(mazamorra, 'Tapa', 3.80, 3);

    const salmorejo = insertItem.run(entrantesId, 'Salmorejo', null, null, null, 9).lastInsertRowid;
    insertVariant.run(salmorejo, 'Entera', 9.50, 1);
    insertVariant.run(salmorejo, 'Media', 7.50, 2);
    insertVariant.run(salmorejo, 'Tapa', 3.50, 3);

    // ── Especialidad de la Casa ──
    const especId = insertCategory.run('especialidad', 'Especialidad de la Casa', 2).lastInsertRowid;
    insertItem.run(especId, 'Kufta de Ternera', 'Humus remolacha, humus tradicional, verdura asada, salsa hierba fresca', null, 14.00, 1);
    insertItem.run(especId, 'Humus de Remolacha / Humus Tradicional', 'Con pan de la casa', null, 6.00, 2);
    insertItem.run(especId, 'Tajine de Pollo', 'Con patatas fritas, pan de la casa', null, 14.00, 3);
    insertItem.run(especId, 'Chawarma de Pollo', 'Con humus tradicional, tomate fresco, pepinillo, pan de la casa', null, 13.50, 4);
    insertItem.run(especId, 'Pastella Moruna', 'Con hojas hojaldre de masa fina, relleno de pollo y almendras', null, 14.00, 5);
    insertItem.run(especId, 'Couscous de Pollo', 'Con sémola, verdura, cebolla caramelizada', '★ Reserva con un día de antelación — mínimo 2 personas', 14.50, 6);
    insertItem.run(especId, 'Couscous de Ternera', 'Con sémola, verdura, cebolla caramelizada', '★ Reserva con un día de antelación — mínimo 2 personas', 16.50, 7);

    // ── Empezamos ──
    const empezId = insertCategory.run('empezamos', 'Empezamos', 3).lastInsertRowid;
    insertItem.run(empezId, 'Tortilla Trufada', null, null, 9.50, 1);
    insertItem.run(empezId, 'Flamenquín La Reseña', 'Con 4 quesos — especialidad de la casa', null, 13.40, 2);
    insertItem.run(empezId, 'Flamenquín Cordobés', null, null, 10.90, 3);
    insertItem.run(empezId, 'Hamburgesa de Ternera', 'Con bacon y cebolla caramelizada, salsa casera', null, 12.00, 4);
    insertItem.run(empezId, 'Revuelto de Patatas', 'Con patata, jamón y huevos', null, 12.00, 5);

    const croquetasTrufa = insertItem.run(empezId, 'Croquetas de Trufa', null, null, null, 6).lastInsertRowid;
    insertVariant.run(croquetasTrufa, 'Entera', 11.90, 1);
    insertVariant.run(croquetasTrufa, 'Media', 7.00, 2);

    const croquetasPuchero = insertItem.run(empezId, 'Croquetas de Puchero', null, null, null, 7).lastInsertRowid;
    insertVariant.run(croquetasPuchero, 'Entera', 11.00, 1);
    insertVariant.run(croquetasPuchero, 'Media', 6.50, 2);

    const croquetasRabo = insertItem.run(empezId, 'Croquetas de Rabo', null, null, null, 8).lastInsertRowid;
    insertVariant.run(croquetasRabo, 'Entera', 12.50, 1);
    insertVariant.run(croquetasRabo, 'Media', 7.50, 2);

    const bravas = insertItem.run(empezId, 'Patatas Bravas', null, null, null, 9).lastInsertRowid;
    insertVariant.run(bravas, 'Entera', 8.90, 1);
    insertVariant.run(bravas, 'Media', 5.50, 2);
    insertVariant.run(bravas, 'Tapa', 3.50, 3);

    const berenjenas = insertItem.run(empezId, 'Berenjenas Crujiente', 'Con miel de caña y queso de cabra', null, null, 10).lastInsertRowid;
    insertVariant.run(berenjenas, 'Entera', 10.00, 1);
    insertVariant.run(berenjenas, 'Media', 7.00, 2);

    const pisto = insertItem.run(empezId, 'Pisto con Huevo', null, null, null, 11).lastInsertRowid;
    insertVariant.run(pisto, 'Entera', 12.50, 1);
    insertVariant.run(pisto, 'Media', 6.50, 2);

    // ── Carnes ──
    const carnesId = insertCategory.run('carnes', 'Carnes', 4).lastInsertRowid;
    insertItem.run(carnesId, 'Carillada', 'Carillada de cerdo con parmentier de patatas', null, 14.00, 1);
    insertItem.run(carnesId, 'Lomo de Vaca', 'Con pimiento verde y patatas', null, 18.00, 2);
    insertItem.run(carnesId, 'Pinchitos de Pollo', 'Con pimiento verde y patatas', null, 3.50, 3);
    insertItem.run(carnesId, 'Rabo de Toro', 'Con patatas', null, 14.50, 4);

    // ── Pescado ──
    const pescadoId = insertCategory.run('pescado', 'Pescado', 5).lastInsertRowid;

    const fritura = insertItem.run(pescadoId, 'Fritura Mixta', null, null, null, 1).lastInsertRowid;
    insertVariant.run(fritura, 'Entera', 17.50, 1);
    insertVariant.run(fritura, 'Media', 11.50, 2);

    const pezEspada = insertItem.run(pescadoId, 'Pez Espada', null, null, null, 2).lastInsertRowid;
    insertVariant.run(pezEspada, 'Entera', 13.50, 1);
    insertVariant.run(pezEspada, 'Media', 8.50, 2);

    const calamares = insertItem.run(pescadoId, 'Calamares Fritos', null, null, null, 3).lastInsertRowid;
    insertVariant.run(calamares, 'Entera', 11.00, 1);
    insertVariant.run(calamares, 'Media', 6.50, 2);

    const choco = insertItem.run(pescadoId, 'Choco Frito', null, null, null, 4).lastInsertRowid;
    insertVariant.run(choco, 'Entera', 13.80, 1);
    insertVariant.run(choco, 'Media', 8.90, 2);

    const gambas = insertItem.run(pescadoId, 'Gambas al Pilpil', null, null, null, 5).lastInsertRowid;
    insertVariant.run(gambas, 'Entera', 13.50, 1);
    insertVariant.run(gambas, 'Media', 10.00, 2);

    const japuta = insertItem.run(pescadoId, 'Japuta', null, null, null, 6).lastInsertRowid;
    insertVariant.run(japuta, 'Entera', 10.50, 1);
    insertVariant.run(japuta, 'Media', 7.50, 2);

    // ── Postres ──
    const postresId = insertCategory.run('postres', 'Postres', 6).lastInsertRowid;
    insertItem.run(postresId, 'Kunafa', null, null, 6.50, 1);
    insertItem.run(postresId, 'Tarta de Queso', null, null, 5.50, 2);
    insertItem.run(postresId, 'Tiramisú', null, null, 5.50, 3);
    insertItem.run(postresId, 'Coulant de Chocolate', 'Con helado de vainilla', null, 5.50, 4);
    insertItem.run(postresId, 'Té Marroquí para 2 Personas', 'La experiencia perfecta para compartir', null, 4.00, 5);
  });

  seedAll();
  console.log('✅ Database seeded with menu data');
}

module.exports = db;
