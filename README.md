# La Reseña — Backend

Node.js + Express REST API with SQLite database for La Reseña bar restaurant.

---

## Stack

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Runtime  | Node.js 18+                                 |
| Framework| Express 4                                   |
| Database | SQLite via `better-sqlite3`                 |
| Auth     | JWT (`jsonwebtoken`) + bcrypt               |
| Email    | Nodemailer (any SMTP — Gmail, Brevo, etc.)  |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (JWT secret, email, etc.)

# 3. Start server (auto-creates DB + seeds menu on first run)
npm start

# Development (auto-restart on changes)
npm run dev
```

Open http://localhost:3000 — the frontend is served from `/public`.

Admin panel: http://localhost:3000/admin.html
- Default credentials: `admin` / `resena2025`
- **Change the password before going live!**

---

## Project Structure

```
resena-backend/
├── server.js                  # Entry point
├── .env.example               # Config template
├── src/
│   ├── db.js                  # SQLite setup + seed
│   ├── mailer.js              # Email notifications
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   └── routes/
│       ├── auth.js            # Login / password
│       ├── reservations.js    # CRUD reservations
│       └── menu.js            # CRUD menu
└── public/                    # Static frontend files
    ├── index.html
    ├── menu.html
    ├── contact.html
    ├── admin.html
    └── ...
```

---

## API Reference

### Auth

| Method | Endpoint             | Auth | Description          |
|--------|----------------------|------|----------------------|
| POST   | /api/auth/login      | ✗    | Login, returns JWT   |
| GET    | /api/auth/me         | ✓    | Verify token         |
| PUT    | /api/auth/password   | ✓    | Change password      |

**Login example:**
```json
POST /api/auth/login
{ "username": "admin", "password": "resena2025" }

→ { "token": "eyJ...", "username": "admin" }
```

All protected routes require:
```
Authorization: Bearer <token>
```

---

### Reservations

| Method | Endpoint                        | Auth | Description              |
|--------|---------------------------------|------|--------------------------|
| POST   | /api/reservations               | ✗    | Create reservation       |
| GET    | /api/reservations               | ✓    | List (filterable)        |
| GET    | /api/reservations/stats         | ✓    | Dashboard counts         |
| GET    | /api/reservations/:id           | ✓    | Get single reservation   |
| PATCH  | /api/reservations/:id/estado    | ✓    | Update status            |
| PUT    | /api/reservations/:id           | ✓    | Full update              |
| DELETE | /api/reservations/:id           | ✓    | Delete                   |

**Query params for GET /api/reservations:**
- `?estado=pendiente|confirmada|cancelada`
- `?fecha=2025-11-15`
- `?search=nombre_o_telefono`

**Create reservation body:**
```json
{
  "nombre":   "María García",
  "telefono": "654 321 098",
  "fecha":    "2025-11-20",
  "hora":     "14:00",
  "personas": "2 personas",
  "ocasion":  "Aniversario",
  "notas":    "Mesa junto a la ventana"
}
```

---

### Menu

| Method | Endpoint                        | Auth | Description              |
|--------|---------------------------------|------|--------------------------|
| GET    | /api/menu                       | ✗    | Full menu by category    |
| GET    | /api/menu/categories            | ✗    | List categories          |
| POST   | /api/menu/categories            | ✓    | Create category          |
| PUT    | /api/menu/categories/:id        | ✓    | Update category          |
| DELETE | /api/menu/categories/:id        | ✓    | Delete category          |
| POST   | /api/menu/items                 | ✓    | Create item              |
| PUT    | /api/menu/items/:id             | ✓    | Update item              |
| DELETE | /api/menu/items/:id             | ✓    | Delete item              |
| PATCH  | /api/menu/items/:id/toggle      | ✓    | Enable/disable item      |

---

## Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. In `.env`:
```
SMTP_USER=tu.correo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   (the 16-char app password)
NOTIFY_EMAIL=restaurante@lareseña.es
```

---

## Deployment

Any Node.js host works: Railway, Render, Fly.io, VPS, etc.

Set all `.env` variables as environment variables on your host.
The SQLite file (`resena.db`) is created automatically on first run.
