const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id         SERIAL PRIMARY KEY,
      username   TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id         SERIAL PRIMARY KEY,
      nombre     TEXT NOT NULL,
      telefono   TEXT NOT NULL,
      fecha      TEXT NOT NULL,
      hora       TEXT NOT NULL,
      personas   TEXT NOT NULL,
      ocasion    TEXT DEFAULT '',
      notas      TEXT DEFAULT '',
      estado     TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','confirmada','cancelada')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id     SERIAL PRIMARY KEY,
      slug   TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      orden  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id           SERIAL PRIMARY KEY,
      category_id  INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
      nombre       TEXT NOT NULL,
      descripcion  TEXT DEFAULT '',
      nota         TEXT DEFAULT '',
      precio       REAL,
      precios_json TEXT DEFAULT NULL,
      activo       INTEGER DEFAULT 1,
      orden        INTEGER DEFAULT 0
    );
  `);

  const existing = await pool.query('SELECT id FROM admins WHERE username = $1', ['admin']);
  if (existing.rows.length === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'resena2025', 10);
    await pool.query('INSERT INTO admins (username, password) VALUES ($1, $2)', ['admin', hash]);
    console.log('Default admin created');
  }

  const catCount = await pool.query('SELECT COUNT(*) as n FROM menu_categories');
  if (parseInt(catCount.rows[0].n) === 0) {
    await seedMenu();
  }
}

async function seedMenu() {
  const insertCat  = (slug, nombre, orden) =>
    pool.query('INSERT INTO menu_categories (slug, nombre, orden) VALUES ($1, $2, $3) RETURNING id', [slug, nombre, orden]);
  const insertItem = (catId, nombre, descripcion, nota, precio, precios_json, orden) =>
    pool.query(
      'INSERT INTO menu_items (category_id, nombre, descripcion, nota, precio, precios_json, orden) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [catId, nombre, descripcion, nota, precio, precios_json, orden]
    );

  const c1 = (await insertCat('entrantes', 'Entrantes', 1)).rows[0].id;
  await insertItem(c1, 'Ensalada de Burrata', 'Con tomate ecológico, salsa de mango, albahaca', '', 8.90, null, 1);
  await insertItem(c1, 'Ensalada de Ventresca', 'Tomate ecológico, ventresca, aguacate', '', 13.50, null, 2);
  await insertItem(c1, 'Tosta de Anchoas', 'Con queso de cabra y cebolla caramelizada', '', 6.00, null, 3);
  await insertItem(c1, 'Tosta de Burrata', 'Con salsa de naranja', '', 7.00, null, 4);
  await insertItem(c1, 'Tabla La Reseña', 'Jamón ibérico, queso curado, salmorejo', '', 14.50, null, 5);
  await insertItem(c1, 'Ensaladilla de Gamba', '', '', null, JSON.stringify({Entera:12.00, Media:7.50, Tapa:4.50}), 6);
  await insertItem(c1, 'Ensaladilla de Salmón Ahumado', 'Salmón ahumado, alcaparras, maíz, pepinillo', '', null, JSON.stringify({Entera:13.50, Media:8.50, Tapa:5.50}), 7);
  await insertItem(c1, 'Mazamorra', 'Con almendras y leche de almendras', '', null, JSON.stringify({Entera:10.50, Media:8.30, Tapa:3.80}), 8);
  await insertItem(c1, 'Salmorejo', '', '', null, JSON.stringify({Entera:9.50, Media:7.50, Tapa:3.50}), 9);

  const c2 = (await insertCat('especialidad', 'Especialidad de la Casa', 2)).rows[0].id;
  await insertItem(c2, 'Kufta de Ternera', 'Humus remolacha, humus tradicional, verdura asada, salsa hierba fresca', '', 14.00, null, 1);
  await insertItem(c2, 'Humus de Remolacha / Humus Tradicional', 'Con pan de la casa', '', 6.00, null, 2);
  await insertItem(c2, 'Tajine de Pollo', 'Con patatas fritas, pan de la casa', '', 14.00, null, 3);
  await insertItem(c2, 'Chawarma de Pollo', 'Con humus tradicional, tomate fresco, pepinillo, pan de la casa', '', 13.50, null, 4);
  await insertItem(c2, 'Pastella Moruna', 'Hojas hojaldre de masa fina, relleno de pollo y almendras', '', 14.00, null, 5);
  await insertItem(c2, 'Couscous de Pollo', 'Con sémola, verdura, cebolla caramelizada', '? Reserva con un día de antelación — mínimo 2 personas', 14.50, null, 6);
  await insertItem(c2, 'Couscous de Ternera', 'Con sémola, verdura, cebolla caramelizada', '? Reserva con un día de antelación — mínimo 2 personas', 16.50, null, 7);

  const c3 = (await insertCat('empezamos', 'Empezamos', 3)).rows[0].id;
  await insertItem(c3, 'Tortilla Trufada', '', '', 9.50, null, 1);
  await insertItem(c3, 'Flamenquín La Reseña', 'Con 4 quesos — especialidad de la casa', '', 13.40, null, 2);
  await insertItem(c3, 'Flamenquín Cordobés', '', '', 10.90, null, 3);
  await insertItem(c3, 'Hamburguesa de Ternera', 'Con bacon y cebolla caramelizada, salsa casera', '', 12.00, null, 4);
  await insertItem(c3, 'Revuelto de Patatas', 'Con patata, jamón y huevos', '', 12.00, null, 5);
  await insertItem(c3, 'Croquetas de Trufa', '', '', null, JSON.stringify({Entera:11.90, Media:7.00}), 6);
  await insertItem(c3, 'Croquetas de Puchero', '', '', null, JSON.stringify({Entera:11.00, Media:6.50}), 7);
  await insertItem(c3, 'Croquetas de Rabo', '', '', null, JSON.stringify({Entera:12.50, Media:7.50}), 8);
  await insertItem(c3, 'Patatas Bravas', '', '', null, JSON.stringify({Entera:8.90, Media:5.50, Tapa:3.50}), 9);
  await insertItem(c3, 'Berenjenas Crujiente', 'Con miel de caña y queso de cabra', '', null, JSON.stringify({Entera:10.00, Media:7.00}), 10);
  await insertItem(c3, 'Pisto con Huevo', '', '', null, JSON.stringify({Entera:12.50, Media:6.50}), 11);

  const c4 = (await insertCat('carnes', 'Carnes', 4)).rows[0].id;
  await insertItem(c4, 'Carillada', 'Carillada de cerdo con parmentier de patatas', '', 14.00, null, 1);
  await insertItem(c4, 'Lomo de Vaca', 'Con pimiento verde y patatas', '', 18.00, null, 2);
  await insertItem(c4, 'Pinchitos de Pollo', 'Con pimiento verde y patatas', '', 3.50, null, 3);
  await insertItem(c4, 'Rabo de Toro', 'Con patatas', '', 14.50, null, 4);

  const c5 = (await insertCat('pescado', 'Pescado', 5)).rows[0].id;
  await insertItem(c5, 'Fritura Mixta', '', '', null, JSON.stringify({Entera:17.50, Media:11.50}), 1);
  await insertItem(c5, 'Pez Espada', '', '', null, JSON.stringify({Entera:13.50, Media:8.50}), 2);
  await insertItem(c5, 'Calamares Fritos', '', '', null, JSON.stringify({Entera:11.00, Media:6.50}), 3);
  await insertItem(c5, 'Choco Frito', '', '', null, JSON.stringify({Entera:13.80, Media:8.90}), 4);
  await insertItem(c5, 'Gambas al Pilpil', '', '', null, JSON.stringify({Entera:13.50, Media:10.00}), 5);
  await insertItem(c5, 'Japuta', '', '', null, JSON.stringify({Entera:10.50, Media:7.50}), 6);

  const c6 = (await insertCat('postres', 'Postres', 6)).rows[0].id;
  await insertItem(c6, 'Kunafa', '', '', 6.50, null, 1);
  await insertItem(c6, 'Tarta de Queso', '', '', 5.50, null, 2);
  await insertItem(c6, 'Tiramisú', '', '', 5.50, null, 3);
  await insertItem(c6, 'Coulant de Chocolate', 'Con helado de vainilla', '', 5.50, null, 4);
  await insertItem(c6, 'Té Marroquí para 2 Personas', 'La experiencia perfecta para compartir', '', 4.00, null, 5);

  console.log('Menu seeded successfully');
}

module.exports = { pool, init };
