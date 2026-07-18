# SRS: Admin Panel

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Administration panel (account oversight & removal) |
| **Status** | Prototype implemented on `dev` (see change log) |
| **Branch intent** | Implement later on `dev`, then PR to `main` |
| **Related docs** | [database.md](../database.md), [api.md](../api.md), [development.md](../development.md) |

---

## 1. Purpose

Provide a **separate, non-public admin area** so the application owner can:

1. See **how many user accounts** exist.
2. See each account’s **username** (and other non-secret identity fields).
3. **Never** see passwords (or password hashes in the UI).
4. **Remove (delete) any user account** when needed (moderation, test cleanup, abuse).

Regular end users must **not** discover or use this area as part of normal signup/login.

---

## 2. Recommended approach (design idea)

### 2.1 Why a separate login (agreed direction)

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Hidden admin login URL** (e.g. `/admin/login`) + admin-only JWT | Clear separation; users never see “Admin” on public login | Must protect URL (obscurity alone is not enough) | **Preferred for v1** |
| Same login form + “admin” role on a normal user | One form | Users may try admin paths; mixes concerns | Not preferred |
| Fully separate app (admin SPA) | Strong isolation | Higher cost to build/host | Later if needed |

**v1 recommendation:**

- Keep the **user** app as today (`/login`, `/register`, dashboard, etc.).
- Add an **admin web area** at a path that is **not linked** from the user UI (no footer/nav link for users).
- Admin authenticates with **admin credentials only** (not a normal expense-tracker username from public signup).
- After admin login, show a simple **Admin dashboard** (counts + user list + delete).

Security must rely on **authentication + authorization**, not only on “secret URL”.

### 2.2 Admin identity model

**Recommended (simple and clear):**

- Store admins separately from end users, **or** mark a privileged account with `role = 'admin'` that **cannot** be created via public register.
- Public register continues to create **user** accounts only.
- Admin password stored **hashed** (same standard as users: bcrypt); never returned by API or shown in UI.

**Minimum admin fields (conceptual):**

| Field | Notes |
|-------|--------|
| id | Primary key |
| username (or email) | Login identifier for admin only |
| password_hash | Never exposed |
| created_at | Optional audit |

*Exact table name (`admins` vs `users.role`) to be decided at implementation time; this SRS requires the behaviors below regardless of storage choice.*

### 2.3 Access control

| Rule | Requirement |
|------|-------------|
| User JWT | Can access only normal `/api/*` user routes; **cannot** call admin APIs |
| Admin JWT | Can access **only** admin APIs (and admin UI); should **not** use the app as a normal expense user unless separately designed later |
| Token type | Admin tokens must be distinguishable (e.g. claim `role: 'admin'` or separate secret/issuer) so user tokens cannot be reused on admin routes |

### 2.4 UI sketch (admin)

```
/admin/login          ← not linked from user app
/admin                ← dashboard (requires admin auth)
```

**Admin dashboard (v1 content):**

| Block | Content |
|-------|---------|
| Summary | Total number of **user** accounts |
| User table | Username, optional email (if present), created date, optional expense count |
| Actions | **Delete account** (with confirmation) |
| Never shown | Password, password hash, JWT secrets |

Mobile: simple table or card list is enough; no need for bottom-tab parity with the user app.

### 2.5 Prototype UI (agreed — keep it simple)

The admin prototype is intentionally **simpler than the user app**. It is an operator tool, not a second full product.

#### Tabs

| Decision | Detail |
|----------|--------|
| **User app** | Keeps Home / Add / Report / Account (bottom tabs on mobile) |
| **Admin prototype** | **No tab bar** — zero navigation tabs |

Multi-tab admin (Users / Analytics / Settings / …) is **out of scope for the prototype**. Tabs only become useful later (exports, audit log, multi-admin settings).

#### Screens (exactly two)

| # | Route | Purpose |
|---|--------|---------|
| 1 | `/admin/login` | Admin sign-in only (username + password, show/hide password optional) |
| 2 | `/admin` | Single dashboard: count + list + delete + logout |

Optional later (not prototype):

| Route | When to add |
|-------|-------------|
| `/admin/users` | Only if the list needs its own page (search, pagination at scale) |
| `/admin/settings` | Only if admin password change, audit log, etc. are required |

#### Information architecture

```
User app (public)          Admin (hidden)
─────────────────          ────────────────
/login                     /admin/login  ──►  /admin
/register                         │              │
/dashboard                        │              ├─ Total accounts
/add-expense                      │              ├─ User list (usernames)
/monthly-expenses                 │              └─ Delete + confirm
/account                          │
     (no link to /admin)          └── not linked from user UI
```

#### Prototype flow

1. Operator opens `/admin/login` (bookmarked or known URL — not shown in user app).
2. Signs in with admin credentials.
3. Lands on `/admin` — sees account **count** and **usernames**.
4. Can **delete** a user after confirmation.
5. **Logout** returns to `/admin/login`.

#### Single dashboard wireframe

```
┌─────────────────────────────────────────────┐
│  Admin · Expense Tracker          [Logout]  │
├─────────────────────────────────────────────┤
│                                             │
│  Total accounts:  12                        │
│                                             │
│  Users                                      │
│  ┌───────────────────────────────────────┐  │
│  │ Username  │ Email (opt) │ Joined │    │  │
│  │ shaminda  │ —           │ …      │ 🗑 │  │
│  │ jane      │ a@b.com     │ …      │ 🗑 │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Delete → confirmation dialog               │
│  (e.g. “Type username to confirm”)          │
└─────────────────────────────────────────────┘
```

#### Layout rules

| Surface | Rule |
|---------|------|
| Desktop | One page; table is fine |
| Mobile | Same single page: summary card on top, list/cards below; **no** bottom tab bar |
| Theme | May follow app light/dark tokens later; prototype can stay light-only |
| Branding | Clear “Admin” label so it is not confused with the user dashboard |

#### Optional polish (still one page — not new tabs)

| Enhancement | Priority |
|-------------|----------|
| Search / filter by username | Could |
| Sort by newest or name | Should |
| Expense count per user | Could (helps decide whom to delete) |
| Empty state when zero users | Should |

#### Why not many tabs?

| Multi-tab admin | One-page admin (chosen) |
|-----------------|-------------------------|
| Overkill for count + list + delete | Matches real v1 needs |
| More routes and design work | Faster prototype |
| Feels like a second full product | Feels like an operator tool |

---

## 3. Functional requirements

### 3.1 Admin authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| **ADM-AUTH-01** | Admin shall sign in via a **dedicated login page** that is **not linked** from user-facing signup/signin/nav. | Must |
| **ADM-AUTH-02** | Public register/login shall **not** create or promote admin accounts. | Must |
| **ADM-AUTH-03** | Admin credentials shall be verified with hashed password storage; failed logins return a generic error (no user enumeration beyond existing app practice). | Must |
| **ADM-AUTH-04** | Successful admin login shall issue a short-lived **admin session token** used only for admin API calls. | Must |
| **ADM-AUTH-05** | Admin logout shall clear the admin session on the client. | Must |
| **ADM-AUTH-06** | Unauthenticated access to admin pages/APIs shall redirect to admin login or return 401/403. | Must |

### 3.2 Account overview

| ID | Requirement | Priority |
|----|-------------|----------|
| **ADM-VIEW-01** | Admin dashboard shall display the **total count** of registered **user** accounts. | Must |
| **ADM-VIEW-02** | Admin dashboard shall list each user **username**. | Must |
| **ADM-VIEW-03** | Admin dashboard **may** show non-secret fields: email (if any), `created_at`, user id. | Should |
| **ADM-VIEW-04** | Admin dashboard **must not** display passwords or password hashes. | Must |
| **ADM-VIEW-05** | Admin dashboard **may** show a simple count of expenses per user (helps decide cleanup). | Could |
| **ADM-VIEW-06** | List shall be ordered sensibly (e.g. newest first or alphabetical). | Should |

### 3.3 Account deletion

| ID | Requirement | Priority |
|----|-------------|----------|
| **ADM-DEL-01** | Admin shall be able to **delete any user account** by id (or username). | Must |
| **ADM-DEL-02** | Delete shall require an explicit **confirmation** step in the UI (e.g. type username or confirm dialog). | Must |
| **ADM-DEL-03** | Deleting a user shall remove the user row and **cascade** related expenses (consistent with existing FK `ON DELETE CASCADE` on expenses). | Must |
| **ADM-DEL-04** | Admin shall **not** be able to delete admin credentials via the “delete user” action (only end-user accounts). | Must |
| **ADM-DEL-05** | Successful delete shall refresh the list and total count. | Must |
| **ADM-DEL-06** | Failed delete shall show a clear error without exposing internal stack traces. | Must |

### 3.4 Visibility / “not seen by the user”

| ID | Requirement | Priority |
|----|-------------|----------|
| **ADM-HID-01** | User-facing UI (login, register, navbar, footer, help) shall **not** link to `/admin` or advertise admin access. | Must |
| **ADM-HID-02** | Admin routes may still exist in the SPA; security must not rely on “unknown URL” alone. | Must |
| **ADM-HID-03** | Production documentation for operators may document the admin path; public README should **not** highlight it unless intentionally published. | Should |

---

## 4. Non-functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **ADM-NFR-01** | All admin API endpoints require valid **admin** authorization. | Must |
| **ADM-NFR-02** | Admin password and env secrets never appear in frontend source or logs. | Must |
| **ADM-NFR-03** | Prefer HTTPS in production (already expected for Vercel/Render). | Must |
| **ADM-NFR-04** | Admin session lifetime should be limited (e.g. ≤ 1 hour, similar to user JWT). | Should |
| **ADM-NFR-05** | Rate-limit or lockout for admin login is desirable (Could for v1). | Could |
| **ADM-NFR-06** | Audit log of admin deletes (who deleted which user, when) is desirable later. | Could |

---

## 5. Out of scope (v1)

Unless later added to this SRS:

- Editing usernames or resetting user passwords from admin UI  
- Viewing another user’s expenses in detail  
- Multi-admin roles (super-admin, support, etc.)  
- Public “forgot password” for admins  
- Analytics beyond account count / simple list  
- Impersonating a user (“login as user”)

---

## 6. API requirements (conceptual — implement later)

These are **requirements**, not a final OpenAPI contract.

| Method | Path (example) | Auth | Purpose |
|--------|----------------|------|---------|
| `POST` | `/api/admin/login` | Public (admin credentials) | Issue admin token |
| `GET` | `/api/admin/users` | Admin | List users + total count (no password fields) |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete user and cascaded expenses |
| `GET` | `/api/admin/me` | Admin | Optional: confirm admin session |

**Response rules:**

- User objects: `id`, `username`, `email` (nullable), `created_at` only.  
- **Forbidden fields:** `password`, any hash.

---

## 7. Data & privacy notes

- Deleting a user is **destructive** and removes their financial records via cascade.  
- Admin should treat usernames/emails as personal data; no export requirement in v1.  
- Production admin credentials should be set via **environment variables** or a one-time seed, not hard-coded.

---

## 8. Acceptance criteria (v1 done when)

- [ ] Admin can log in only via the dedicated admin login path  
- [ ] Normal users cannot obtain admin privileges through register  
- [ ] Dashboard shows account **count** and **usernames** (no passwords)  
- [ ] Admin can delete a user with confirmation; user + expenses are gone  
- [ ] User app has no link to admin  
- [ ] Documented for operators (this SRS + short note in deployment docs when implemented)

---

## 9. Implementation notes (when coding is approved)

Suggested order (for a future PR plan):

1. Data model for admin identity + seed/env bootstrap  
2. Admin auth middleware + login API  
3. List users + count API  
4. Delete user API  
5. Minimal admin UI (`/admin/login`, `/admin` dashboard)  
6. Hardening (CORS already app-wide; ensure admin routes covered)

**No application code is required by this document.** Implementation waits for explicit product-owner approval.

---

## 10. Open decisions (to resolve before or during build)

| # | Question | Default if not decided |
|---|----------|------------------------|
| 1 | `admins` table vs `users.role = admin`? | Prefer separate `admins` table for clearer isolation |
| 2 | Admin path prefix? | `/admin` |
| 3 | Bootstrap first admin via env (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) or one-time script? | Env + seed on first boot |
| 4 | Soft-delete vs hard-delete? | Hard-delete with cascade (matches current FK) |

---

## 11. Change log

| Date | Change |
|------|--------|
| 2026-07-18 | Initial draft: overview, hidden admin login, list users, delete accounts, no passwords in UI |
| 2026-07-18 | Added **§2.5 Prototype UI**: no tabs, two screens only (login + dashboard), wireframe, optional one-page polish |
| 2026-07-18 | Prototype coded on `dev`: `/admin/login`, `/admin`, `POST/GET/DELETE /api/admin/*`, env seed `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
