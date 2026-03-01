const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'resena.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    telefono    TEXT    NOT NULL,
    fecha       TEXT    NOT NULL,
    hora        TEXT    NOT NULL,
    personas    TEXT    NOT NULL,
    ocasion     TEXT    DEFAULT '',
    notas       TEXT    DEFAULT '',
    estado      TEXT    DEFAULT 'pendiente'
                        CHECK(estado IN ('pendiente','confirmada','cancelada')),
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menu_categories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT    NOT NULL UNIQUE,
    nombre       TEXT    NOT NULL,
    orden        INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id  INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    nombre       TEXT    NOT NULL,
    descripcion  TEXT    DEFAULT '',
    nota         TEXT    DEFAULT '',
    precio       REAL,
    precios_json TEXT    DEFAULT NULL,   -- JSON for multi-size items
    activo       INTEGER DEFAULT 1,
    orden        INTEGER DEFAULT 0
  );
`);

// ── Seed default admin ────────────────────────────────────────────────────────

const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!existingAdmin) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'resena2025', 10);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hash);
  console.log('🔐  Default admin created  (user: admin / pass: resena2025)');
}

// ── Seed menu ─────────────────────────────────────────────────────────────────

const catCount = db.prepare('SELECT COUNT(*) as n FROM menu_categories').get().n;
if (catCount === 0) {
  const insertCat  = db.prepare('INSERT INTO menu_categories (slug, nombre, orden) VALUES (?, ?, ?)');
  const insertItem = db.prepare(`
    INSERT INTO menu_items (category_id, nombre, descripcion, nota, precio, precios_json, orden)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seedMenu = db.transaction(() => {
    // Entrantes
    const c1 = insertCat.run('entrantes', 'Entrantes', 1).lastInsertRowid;
    insertItem.run(c1, 'Ensalada de Burrata',           'Con tomate ecológico, salsa de mango, albahaca', '', 8.90,  null, 1);
    insertItem.run(c1, 'Ensalada de Ventresca',         'Tomate ecológico, ventresca, aguacate',          '', 13.50, null, 2);
    insertItem.run(c1, 'Tosta de Anchoas',              'Con queso de cabra y cebolla caramelizada',      '', 6.00,  null, 3);
    insertItem.run(c1, 'Tosta de Burrata',              'Con salsa de naranja',                           '', 7.00,  null, 4);
    insertItem.run(c1, 'Tabla La Reseña',               'Jamón ibérico, queso curado, salmorejo',         '', 14.50, null, 5);
    insertItem.run(c1, 'Ensaladilla de Gamba',          '',  '', null, JSON.stringify({Entera:12.00, Media:7.50, Tapa:4.50}), 6);
    insertItem.run(c1, 'Ensaladilla de Salmón Ahumado', 'Salmón ahumado, alcaparras, maïs, pepinillo', '', null, JSON.stringify({Entera:13.50, Media:8.50, Tapa:5.50}), 7);
    insertItem.run(c1, 'Mazamorra',                     'Con almendras y leche de almendras', '', null, JSON.stringify({Entera:10.50, Media:8.30, Tapa:3.80}), 8);
    insertItem.run(c1, 'Salmorejo',                     '',  '', null, JSON.stringify({Entera:9.50, Media:7.50, Tapa:3.50}), 9);

    // Especialidad de la Casa
    const c2 = insertCat.run('especialidad', 'Especialidad de la Casa', 2).lastInsertRowid;
    insertItem.run(c2, 'Kufta de Ternera',                'Humus remolacha, humus tradicional, verdura asada, salsa hierba fresca', '', 14.00, null, 1);
    insertItem.run(c2, 'Humus de Remolacha / Humus Tradicional', 'Con pan de la casa', '', 6.00, null, 2);
    insertItem.run(c2, 'Tajine de Pollo',                 'Con patatas fritas, pan de la casa', '', 14.00, null, 3);
    insertItem.run(c2, 'Chawarma de Pollo',               'Con humus tradicional, tomate fresco, pepinillo, pan de la casa', '', 13.50, null, 4);
    insertItem.run(c2, 'Pastella Moruna',                 'Hojas hojaldre de masa fina, relleno de pollo y almendras', '', 14.00, null, 5);
    insertItem.run(c2, 'Couscous de Pollo',               'Con sémola, verdura, cebolla caramelizada', '★ Reserva con un día de antelación — mínimo 2 personas', 14.50, null, 6);
    insertItem.run(c2, 'Couscous de Ternera',             'Con sémola, verdura, cebolla caramelizada', '★ Reserva con un día de antelación — mínimo 2 personas', 16.50, null, 7);

    // Empezamos
    const c3 = insertCat.run('empezamos', 'Empezamos', 3).lastInsertRowid;
    insertItem.run(c3, 'Tortilla Trufada',      '', '', 9.50,  null, 1);
    insertItem.run(c3, 'Flamenquín La Reseña',  'Con 4 quesos — especialidad de la casa', '', 13.40, null, 2);
    insertItem.run(c3, 'Flamenquín Cordobés',   '', '', 10.90, null, 3);
    insertItem.run(c3, 'Hamburguesa de Ternera','Con bacon y cebolla caramelizada, salsa casera', '', 12.00, null, 4);
    insertItem.run(c3, 'Revuelto de Patatas',   'Con patata, jamón y huevos', '', 12.00, null, 5);
    insertItem.run(c3, 'Croquetas de Trufa',    '', '', null, JSON.stringify({Entera:11.90, Media:7.00}), 6);
    insertItem.run(c3, 'Croquetas de Puchero',  '', '', null, JSON.stringify({Entera:11.00, Media:6.50}), 7);
    insertItem.run(c3, 'Croquetas de Rabo',     '', '', null, JSON.stringify({Entera:12.50, Media:7.50}), 8);
    insertItem.run(c3, 'Patatas Bravas',        '', '', null, JSON.stringify({Entera:8.90,  Media:5.50, Tapa:3.50}), 9);
    insertItem.run(c3, 'Berenjenas Crujiente',  'Con miel de caña y queso de cabra', '', null, JSON.stringify({Entera:10.00, Media:7.00}), 10);
    insertItem.run(c3, 'Pisto con Huevo',       '', '', null, JSON.stringify({Entera:12.50, Media:6.50}), 11);

    // Carnes
    const c4 = insertCat.run('carnes', 'Carnes', 4).lastInsertRowid;
    insertItem.run(c4, 'Carillada',       'Carillada de cerdo con parmentier de patatas', '', 14.00, null, 1);
    insertItem.run(c4, 'Lomo de Vaca',    'Con pimiento verde y patatas', '', 18.00, null, 2);
    insertItem.run(c4, 'Pinchitos de Pollo', 'Con pimiento verde y patatas', '', 3.50, null, 3);
    insertItem.run(c4, 'Rabo de Toro',    'Con patatas', '', 14.50, null, 4);

    // Pescado
    const c5 = insertCat.run('pescado', 'Pescado', 5).lastInsertRowid;
    insertItem.run(c5, 'Fritura Mixta',   '', '', null, JSON.stringify({Entera:17.50, Media:11.50}), 1);
    insertItem.run(c5, 'Pez Espada',      '', '', null, JSON.stringify({Entera:13.50, Media:8.50}),  2);
    insertItem.run(c5, 'Calamares Fritos','', '', null, JSON.stringify({Entera:11.00, Media:6.50}),  3);
    insertItem.run(c5, 'Choco Frito',     '', '', null, JSON.stringify({Entera:13.80, Media:8.90}),  4);
    insertItem.run(c5, 'Gambas al Pilpil','', '', null, JSON.stringify({Entera:13.50, Media:10.00}), 5);
    insertItem.run(c5, 'Japuta',          '', '', null, JSON.stringify({Entera:10.50, Media:7.50}),  6);

    // Postres
    const c6 = insertCat.run('postres', 'Postres', 6).lastInsertRowid;
    insertItem.run(c6, 'Kunafa',               '', '', 6.50, null, 1);
    insertItem.run(c6, 'Tarta de Queso',       '', '', 5.50, null, 2);
    insertItem.run(c6, 'Tiramisú',             '', '', 5.50, null, 3);
    insertItem.run(c6, 'Coulant de Chocolate', 'Con helado de vainilla', '', 5.50, null, 4);
    insertItem.run(c6, 'Té Marroquí para 2 Personas', 'La experiencia perfecta para compartir', '', 4.00, null, 5);
  });

  seedMenu();
  console.log('🍽️   Menu seeded successfully');
}

module.exports = db;
