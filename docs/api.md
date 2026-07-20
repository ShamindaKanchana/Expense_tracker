# API Reference

REST API for the Expense Tracker backend (Express + MySQL).

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:5000` |
| Production | `https://expense-tracker-api-bjju.onrender.com` |

All application routes are under `/api`, except the root health check.

**Example:** login → `POST http://localhost:5000/api/auth/login`

---

## Authentication

Most endpoints require a **JWT** obtained from login or register.

| Item | Value |
|------|-------|
| Header | `Authorization: Bearer <token>` |
| Token lifetime | 1 hour |
| Payload | `{ userId: <number> }` |

### How to authenticate

1. Call `POST /api/auth/login` or `POST /api/auth/register`.
2. Save the `token` from the response.
3. Send it on every protected request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Auth error responses

| Status | Meaning |
|--------|---------|
| `401` | Missing token, invalid token, or expired token |
| `404` | User not found (`/api/auth/me` only) |

---

## Access summary

| Access | Endpoints |
|--------|-----------|
| **Public** (no token) | `GET /`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/expenses/test-db` |
| **Private** (token required) | All other `/api/auth/*` and `/api/expenses/*` routes listed below |

> **Note:** `GET /api/expenses/test-db` is public and intended for diagnostics. Consider restricting it in production.

---

## Endpoints

### Health check

#### `GET /`

| | |
|--|--|
| **Access** | Public |
| **Description** | Simple check that the API server is running. |

**Response:** `200` — plain text

```
Expense Tracker API is running
```

---

## Auth (`/api/auth`)

### `POST /api/auth/register`

| | |
|--|--|
| **Access** | Public |
| **Description** | Create a new account with **username + password** (email not required). Returns a JWT. |

**Request body**

```json
{
  "username": "jane",
  "password": "secret123"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `username` | Yes | Min 3 characters, unique |
| `password` | Yes | Min 6 characters |
| `email` | No | Optional; stored if provided (legacy). New UI does not send it |

**Success:** `201`

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "jane",
    "email": null
  }
}
```

**Errors**

| Status | When |
|--------|------|
| `400` | Missing fields, short username/password, or duplicate username/email |
| `500` | Server error |

---

### `POST /api/auth/login`

| | |
|--|--|
| **Access** | Public |
| **Description** | Sign in with **username or email** + password; returns a JWT. Existing email users and new username-only users both work. |

**Request body**

```json
{
  "login": "jane",
  "password": "secret123"
}
```

Also accepted for compatibility: `identifier`, `username`, or `email` instead of `login`.

| Field | Required | Notes |
|-------|----------|-------|
| `login` | Yes | Username **or** email of an existing account |
| `password` | Yes | Account password |

**Success:** `200`

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "jane",
    "email": null
  }
}
```

**Errors**

| Status | When |
|--------|------|
| `400` | Missing login or password |
| `401` | Incorrect username/email or password |
| `500` | Server error |

---

### `POST /api/auth/forgot-password`

| | |
|--|--|
| **Access** | Public |
| **Description** | Create a pending password-reset request for a username (admin must approve). Always returns a generic success message. |

**Request body:** `{ "username": "jane" }`

**Success:** `200` — `{ "success": true, "message": "If this account exists, …" }`

### `POST /api/auth/reset-password`

| | |
|--|--|
| **Access** | Public |
| **Description** | Set a new password using username + one-time admin code. |

**Request body:** `{ "username", "code", "newPassword" }`

**Success:** `200` — `{ "success": true, "message": "…" }`

### `GET /api/auth/me`

| | |
|--|--|
| **Access** | Private |
| **Description** | Get the profile of the currently logged-in user. |

**Headers:** `Authorization: Bearer <token>`

**Success:** `200`

```json
{
  "id": 1,
  "username": "jane",
  "email": null,
  "created_at": "2025-01-15T10:00:00.000Z"
}
```

**Errors**

| Status | When |
|--------|------|
| `401` | Invalid or missing token |
| `404` | User not found |
| `500` | Server error |

---

### `POST /api/auth/change-password`

| | |
|--|--|
| **Access** | Private |
| **Description** | Change the logged-in user's password. |

**Request body**

```json
{
  "currentPassword": "oldpass1",
  "newPassword": "newpass1"
}
```

**Success:** `200`

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

**Errors**

| Status | When |
|--------|------|
| `400` | Missing fields, weak password, or incorrect current password |
| `401` | Invalid or missing token |
| `404` | User not found |
| `500` | Server error |

---

## Expenses (`/api/expenses`)

All expense data is scoped to the **authenticated user**. Users can only read, update, or delete their own expenses.

### `GET /api/expenses/test-db`

| | |
|--|--|
| **Access** | Public |
| **Description** | Test database connectivity and list tables (diagnostic). |

**Success:** `200`

```json
{
  "success": true,
  "message": "Database connection successful",
  "ping": true,
  "tables": ["users", "expenses", "categories"]
}
```

**Errors:** `500` — database connection failed

---

### `GET /api/expenses`

| | |
|--|--|
| **Access** | Private (intended) |
| **Status** | **Not implemented** — route exists but returns no data. |

---

### `POST /api/expenses`

| | |
|--|--|
| **Access** | Private |
| **Description** | Add a new expense for the logged-in user. |

**Request body**

```json
{
  "amount": 1500.50,
  "description": "Groceries",
  "category": "Food",
  "date": "2026-07-16"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `amount` | Yes | Must be a positive number |
| `description` | Yes | Non-empty string |
| `category` | Yes | Non-empty string |
| `date` | No | Defaults to current date/time |

**Success:** `201` — created expense object

**Errors**

| Status | When |
|--------|------|
| `400` | Invalid or missing fields |
| `401` | Not authenticated |
| `500` | Server error |

---

### `PUT /api/expenses/:id`

| | |
|--|--|
| **Access** | Private |
| **Description** | Update an existing expense (must belong to the logged-in user). |

**Request body** — same fields as `POST /api/expenses`

**Success:** `200` — updated expense object

**Errors**

| Status | When |
|--------|------|
| `400` | Invalid or missing fields |
| `401` | Not authenticated |
| `404` | Expense not found or not owned by user |
| `500` | Server error |

---

### `DELETE /api/expenses/:id`

| | |
|--|--|
| **Access** | Private |
| **Description** | Delete an expense (must belong to the logged-in user). |

**Success:** `200`

```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

**Errors**

| Status | When |
|--------|------|
| `401` | Not authenticated |
| `404` | Expense not found or not owned by user |
| `500` | Server error |

---

### `GET /api/expenses/recent`

| | |
|--|--|
| **Access** | Private |
| **Description** | Get the 5 most recent expenses for the logged-in user. |
| **Used by** | Dashboard |

**Success:** `200` — array of expenses

```json
[
  {
    "id": 12,
    "description": "Bus fare",
    "category": "Transport",
    "date": "2026-07-15",
    "amount": 250
  }
]
```

---

### `GET /api/expenses/current-month-total`

| | |
|--|--|
| **Access** | Private |
| **Description** | Total amount spent in the current calendar month. |
| **Used by** | Dashboard |

**Success:** `200`

```json
{
  "success": true,
  "total": 45230.75
}
```

---

### `GET /api/expenses/monthly-summary`

| | |
|--|--|
| **Access** | Private |
| **Description** | Monthly totals grouped by year and month (all time). |
| **Used by** | Dashboard |

**Success:** `200`

```json
{
  "success": true,
  "monthlyData": [
    { "month": "July", "year": 2026, "total": 12000 },
    { "month": "August", "year": 2025, "total": 8500 }
  ]
}
```

---

### `GET /api/expenses/monthly-totals`

| | |
|--|--|
| **Access** | Private |
| **Description** | Returns the single highest-spending month for the user. |
| **Used by** | Dashboard |

**Success:** `200`

```json
{
  "success": true,
  "highestSpendingMonth": {
    "month": "December",
    "year": 2025,
    "total": 40000
  }
}
```

If the user has no expenses: `highestSpendingMonth` is `null`.

---

### `GET /api/expenses/years`

| | |
|--|--|
| **Access** | Private |
| **Description** | Distinct calendar years that have at least one expense for the logged-in user (newest first). |
| **Used by** | Monthly Report year dropdown |

**Success:** `200`

```json
{ "years": [2026, 2025] }
```

Empty list if the user has no expenses: `{ "years": [] }`.

---

### `GET /api/expenses/monthly`

| | |
|--|--|
| **Access** | Private |
| **Description** | Monthly expense totals grouped by month, optionally filtered by year. |
| **Used by** | Monthly Report page |

**Query parameters**

| Param | Required | Notes |
|-------|----------|-------|
| `year` | No | Four-digit year (e.g. `2025`). When set, SQL filters `YEAR(date) = year`. Omit for all years. |

**Success:** `200` — array (empty if the user has no expenses for that year)

```json
[
  { "month": 7, "year": 2025, "total": 1200, "count": 3 },
  { "month": 12, "year": 2025, "total": 40000, "count": 15 }
]
```

---

### `GET /api/expenses/categories`

| | |
|--|--|
| **Access** | Private |
| **Description** | Expenses grouped by category, optionally filtered by month and year. |
| **Used by** | Dashboard, Monthly Report, Add Expense |

**Query parameters**

| Param | Required | Notes |
|-------|----------|-------|
| `month` | No | Month number (`01`–`12`) |
| `year` | No | Four-digit year; use together with `month` |

**Success:** `200` — array

```json
[
  {
    "id": "food",
    "name": "Food",
    "total": 15000,
    "count": 8
  }
]
```

---

### `GET /api/expenses/top-category`

| | |
|--|--|
| **Access** | Private |
| **Description** | The category with the highest total spend (all time). |

**Success:** `200`

```json
{
  "success": true,
  "data": {
    "name": "Food",
    "total": 25000,
    "count": 12
  }
}
```

If no expenses exist: `data` is `null`.

---

## Quick reference table

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| `GET` | `/` | Public | API health check |
| `POST` | `/api/auth/register` | Public | Create account (username + password) + JWT |
| `POST` | `/api/auth/login` | Public | Sign in (username or email + password) + JWT |
| `GET` | `/api/auth/me` | Private | Current user profile |
| `POST` | `/api/auth/change-password` | Private | Change password |
| `GET` | `/api/expenses/test-db` | Public | DB diagnostic |
| `GET` | `/api/expenses` | Private* | List expenses (*not implemented) |
| `POST` | `/api/expenses` | Private | Add expense |
| `PUT` | `/api/expenses/:id` | Private | Update expense |
| `DELETE` | `/api/expenses/:id` | Private | Delete expense |
| `GET` | `/api/expenses/recent` | Private | Latest 5 expenses |
| `GET` | `/api/expenses/current-month-total` | Private | Current month total |
| `GET` | `/api/expenses/monthly-summary` | Private | All monthly totals |
| `GET` | `/api/expenses/monthly-totals` | Private | Highest spending month |
| `GET` | `/api/expenses/years` | Private | Years with expense data |
| `GET` | `/api/expenses/monthly` | Private | Monthly breakdown |
| `GET` | `/api/expenses/categories` | Private | Category breakdown |
| `GET` | `/api/expenses/top-category` | Private | Top category |

---

## CORS

In production, only origins listed in `CORS_ALLOWED_ORIGINS` can call the API from a browser.

| Header | Allowed values |
|--------|----------------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <token>` |

Methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

---

## Admin (`/api/admin`)

Separate from user auth. Admin UI: `/admin/login` (not linked from the user app). See [srs/admin-panel.md](./srs/admin-panel.md).

Seed admin via `ADMIN_USERNAME` and `ADMIN_PASSWORD` in backend `.env` (created on server start if missing).

### `POST /api/admin/login`

| | |
|--|--|
| **Access** | Public (admin credentials only) |
| **Description** | Sign in as admin; returns admin JWT (`role: admin`). |

**Request body**

```json
{ "username": "admin", "password": "secret" }
```

**Success:** `200` — `{ "token": "<jwt>", "admin": { "id", "username" } }`

### `GET /api/admin/me`

| | |
|--|--|
| **Access** | Admin JWT |
| **Description** | Current admin profile. |

### `GET /api/admin/users`

| | |
|--|--|
| **Access** | Admin JWT |
| **Description** | List all **user** accounts + total count. Never includes passwords. |

**Success:** `200`

```json
{
  "total": 2,
  "users": [
    {
      "id": 1,
      "username": "jane",
      "email": null,
      "created_at": "2026-07-01T00:00:00.000Z",
      "expense_count": 5
    }
  ]
}
```

### `DELETE /api/admin/users/:id`

| | |
|--|--|
| **Access** | Admin JWT |
| **Description** | Hard-delete a user account; expenses cascade. |

### `GET /api/admin/password-resets`

| | |
|--|--|
| **Access** | Admin JWT |
| **Description** | List **pending** password reset requests (no raw codes). |

### `POST /api/admin/password-resets/:id/approve`

| | |
|--|--|
| **Access** | Admin JWT |
| **Description** | Approve request; response includes **one-time code once** (30 min expiry). |

### `POST /api/admin/password-resets/:id/reject`

| | |
|--|--|
| **Access** | Admin JWT |
| **Description** | Reject a pending request. Optional body: `{ "reason" }`. |

---

## Related docs

- [database.md](./database.md) — tables, ER diagram, and model layer
- [srs/admin-panel.md](./srs/admin-panel.md) — admin panel requirements
- [development.md](./development.md) — local setup and env vars
- [deployment/README.md](./deployment/README.md) — production deployment