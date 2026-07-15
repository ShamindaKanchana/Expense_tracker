# Local Development Guide

Run the Expense Tracker on your machine with **localhost:3000** (frontend) and **localhost:5000** (backend).

## Prerequisites

- Node.js v16+
- npm v8+
- MySQL 8+ (local instance recommended for safe testing)
- Git

## Quick start

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env        # then edit with your values
npm run dev

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm start
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |
| API base | http://localhost:5000/api |

The browser should open automatically. If not, go to http://localhost:3000.

---

## Environment variables

Configuration uses `.env` files locally — **no production URLs are hardcoded in source code**.

### Backend (`backend/.env`)

Copy from the template:

```bash
cd backend
cp .env.example .env
```

| Variable | Example (local) | Purpose |
|----------|-------------------|---------|
| `NODE_ENV` | `development` | Enables permissive CORS for localhost |
| `PORT` | `5000` | API port |
| `JWT_SECRET` | `your-local-secret` | Signs login tokens |
| `JWT_EXPIRE` | `24h` | Optional token lifetime |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `your_password` | MySQL password |
| `DB_NAME` | `expense_tracker` | Database name |
| `DB_PORT` | `3306` | MySQL port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Only enforced when `NODE_ENV=production` |

> **Safety:** If `DB_HOST` points at Aiven (cloud), local dev reads and writes **production data**. Use `DB_HOST=localhost` for safe testing.

### Frontend (`frontend/.env`)

```bash
cd frontend
cp .env.example .env
```

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `http://localhost:5000/api` |

If `frontend/.env` is missing, the app falls back to `http://localhost:5000/api` automatically.

---

## NPM scripts

### Backend (`backend/package.json`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start with **nodemon** (auto-restart on file changes) |
| `npm start` | Start with **node** (used in production on Render/Railway) |

### Frontend (`frontend/package.json`)

| Command | What it does |
|---------|--------------|
| `npm start` | React dev server on port 3000 |
| `npm run build` | Production build → `frontend/build` |
| `npm test` | Run tests |

---

## Verify everything works

### 1. Backend health

```bash
curl http://localhost:5000/
```

Expected: `Expense Tracker API is running`

### 2. Database connection

Check the backend terminal for:

```
Successfully connected to MySQL database
Users table is ready
Expenses table is ready
```

Or:

```bash
curl http://localhost:5000/api/expenses/test-db
```

### 3. Frontend → backend

1. Open http://localhost:3000
2. Register or log in
3. Add an expense on the dashboard

If requests fail, open browser **DevTools → Network** and confirm calls go to `localhost:5000/api`.

---

## How local dev differs from production

| Aspect | Local | Production |
|--------|-------|------------|
| Frontend | `npm start` on :3000 | Vercel serves `build/` |
| Backend | `npm run dev` on :5000 | Render/Railway runs `npm start` |
| API URL | `frontend/.env` or default | `REACT_APP_API_URL` on Vercel |
| CORS | All origins allowed in dev | `CORS_ALLOWED_ORIGINS` on Render |
| Database | Your `backend/.env` | Aiven credentials on Render |

See [deployment/render-migration.md](./deployment/render-migration.md) for production setup.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `EADDRINUSE` on port 5000 | Another process is using 5000 — stop it or change `PORT` in `backend/.env` |
| CORS error in browser | Ensure backend runs with `NODE_ENV=development` |
| API returns HTML instead of JSON | Backend not running, or wrong `REACT_APP_API_URL` |
| DB connection error | Check `DB_*` values; confirm MySQL is running |
| Frontend shows old API URL | Restart `npm start` after changing `frontend/.env` |

---

## Related docs

- [deployment/README.md](./deployment/README.md) — production architecture and Render migration
- [../README.md](../README.md) — project overview