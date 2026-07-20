# SRS: Password Reset via Admin Approval

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Forgot password with administrator approval + one-time code |
| **Status** | Implemented on `dev` (see change log) |
| **Branch intent** | Implement later on `dev`, then PR to `main` |
| **Depends on** | [admin-panel.md](./admin-panel.md) (admin login + dashboard) |
| **Related docs** | [api.md](../api.md), [database.md](../database.md), [development.md](../development.md) |

---

## 1. Purpose

Allow a user who **forgot their password** to request a reset **without email verification**.

Because this app does not verify real email addresses, the reset path is:

1. User submits a **forgot password** request (by username).
2. Request appears to the **admin**.
3. Admin **approves** or **rejects**.
4. On approval, a **one-time code** is generated (shown to admin once).
5. User enters **username + code + new password + confirm** on a reset page.
6. User logs in with the new password.

**Integrity goals:** no plaintext password shared with admin; one-time, short-lived codes; no account enumeration on the public form; admin cannot complete the reset without the user’s new password.

---

## 2. Why this approach

| Option | Fit for Expense Tracker |
|--------|-------------------------|
| Email magic link | Weak fit — email is optional / not verified |
| SMS OTP | Extra cost/provider |
| Security questions only | Weak integrity |
| **Admin-approved + one-time code** | **Preferred v1** — matches existing admin panel and username-only accounts |

Admin is a **bottleneck** by design (small app / known users). Social engineering is mitigated because only admin can approve, and the user must still set the password with a single-use code.

---

## 3. End-to-end flow

```text
User                          System                         Admin
 |                              |                              |
 |-- Forgot password ---------->|                              |
 |   (username)                 |-- create pending request --->|
 |<-- generic success message --|                              |
 |                              |                              |
 |                              |<-- list pending -------------|
 |                              |-- approve ------------------>|
 |                              |-- generate one-time code ----|
 |                              |   (hash stored; raw shown    |
 |                              |    to admin once)            |
 |                              |                              |
 |   (admin shares code OOB*)   |                              |
 |                              |                              |
 |-- Reset password ----------->|                              |
 |   username + code +          |-- validate; update hash;     |
 |   new password + confirm     |   mark completed             |
 |<-- success → login ----------|                              |
```

\* **OOB** = out-of-band (WhatsApp, call, in person, etc.). The product does not require built-in messaging for v1.

### Status state machine

```text
pending ──approve──► approved ──user sets password──► completed
   │                     │
   │                     └──expire──► expired
   └──reject──► rejected
```

Rules:

- Only **one active `pending`** request per user at a time (new request supersedes or is rejected if one exists — product choice: **supersede** recommended).
- Password set is allowed only when status is **`approved`**, code matches, not expired, not used.
- After `completed` / `expired` / `rejected`, user must start a new forgot-password request.

---

## 4. Verification & integrity principles

| Principle | Enforcement |
|-----------|-------------|
| **No password to admin** | Admin never enters or views the user’s new password |
| **No raw token storage** | Store **hash** of one-time code only (bcrypt or SHA-256 of high-entropy secret) |
| **One-time use** | Set `used_at` on success; reject reuse |
| **Short lifetime** | Code valid **30–60 minutes** after approval (recommend **30 min**) |
| **Bound to user** | Code tied to `user_id` + request id |
| **No account leak** | Public forgot-password always returns the same message whether or not the username exists |
| **Explicit admin action** | Approve / Reject with confirmation; log `admin_id` + timestamp |
| **Rate limiting** | Limit forgot-password attempts per username/IP (e.g. 5/hour) — Should |
| **Password rules** | Same as register (min 6 characters); confirm must match |
| **Session** | After reset, user must log in again with the new password |

---

## 5. Data model (conceptual)

### Table: `password_reset_requests`

| Column | Type / notes |
|--------|----------------|
| `id` | PK |
| `user_id` | FK → `users.id` ON DELETE CASCADE |
| `status` | `pending` \| `approved` \| `rejected` \| `completed` \| `expired` |
| `requested_at` | timestamp |
| `request_ip` | optional audit |
| `user_agent` | optional audit |
| `reviewed_at` | nullable |
| `reviewed_by_admin_id` | FK → `admins.id`, nullable |
| `reject_reason` | optional text |
| `code_hash` | nullable until approve |
| `code_expires_at` | nullable until approve |
| `used_at` | nullable |
| `created_at` / `updated_at` | optional |

**UI and APIs must never return:** user password, password hash, raw reset code after the one-time admin display (except that single approve response).

---

## 6. Functional requirements

### 6.1 User — request reset

| ID | Requirement | Priority |
|----|-------------|----------|
| **PWR-U-01** | Login page shall offer a **Forgot password?** link. | Must |
| **PWR-U-02** | User shall submit **username** only (not email required). | Must |
| **PWR-U-03** | If the username exists, system creates a **`pending`** reset request. | Must |
| **PWR-U-04** | Response message shall be **generic** whether or not the username exists (e.g. “If this account exists, a reset request was sent to the administrator.”). | Must |
| **PWR-U-05** | If a pending request already exists for that user, system shall **replace** it or inform generically without leaking state (prefer replace/supersede). | Should |
| **PWR-U-06** | Public register/login shall not expose whether a reset is pending. | Must |

### 6.2 Admin — review requests

| ID | Requirement | Priority |
|----|-------------|----------|
| **PWR-A-01** | Admin dashboard shall show **pending** password reset requests (username, requested time). | Must |
| **PWR-A-02** | Admin shall **Approve** or **Reject** a pending request (with confirm). | Must |
| **PWR-A-03** | On **Approve**, system generates a **one-time code**, stores **hash** + expiry, sets status `approved`. | Must |
| **PWR-A-04** | On Approve, UI shall show the **raw code once** (copyable) for the admin to give the user out-of-band. | Must |
| **PWR-A-05** | On **Reject**, status becomes `rejected`; optional reason stored. | Should |
| **PWR-A-06** | Admin shall not see or set the user’s new password. | Must |
| **PWR-A-07** | Only admin JWT may call review endpoints. | Must |
| **PWR-A-08** | Admin may see recent non-pending history (approved/rejected/completed) — optional. | Could |

### 6.3 User — set new password

| ID | Requirement | Priority |
|----|-------------|----------|
| **PWR-U-10** | User-facing page (e.g. `/reset-password`) shall accept **username**, **one-time code**, **new password**, **confirm password**. | Must |
| **PWR-U-11** | System validates: user exists, latest eligible request is `approved`, code matches hash, not expired, not used. | Must |
| **PWR-U-12** | On success: update user password hash; set request `completed` + `used_at`; invalidate code. | Must |
| **PWR-U-13** | On failure: generic error (do not reveal which check failed beyond “invalid or expired code”). | Should |
| **PWR-U-14** | Password rules match registration (min length, confirm match). | Must |
| **PWR-U-15** | After success, redirect to **login** with a success hint. | Should |

### 6.4 Integrity / ops

| ID | Requirement | Priority |
|----|-------------|----------|
| **PWR-I-01** | Expired approved codes shall not allow reset; status may be updated to `expired` lazily or by job. | Must |
| **PWR-I-02** | Rate-limit forgot-password submissions. | Should |
| **PWR-I-03** | Log admin approve/reject (admin id, request id, user id, time). | Should |
| **PWR-I-04** | Deleting a user (admin delete) shall cascade or cancel open reset requests. | Must |

---

## 7. UI requirements

### 7.1 User app

| Screen | Content |
|--------|---------|
| Login | Link: **Forgot password?** |
| Forgot password | Username field + Submit + link back to login |
| Reset password | Username, one-time code, new password, confirm (+ show/hide password) |

No need for new bottom tabs; these are auth-style pages like login/register.

### 7.2 Admin app (extend existing single dashboard)

Still **no extra tabs** for prototype. Add a section on `/admin`:

| Block | Content |
|-------|---------|
| **Password reset requests** | Table of `pending` (username, requested_at) |
| Actions | Approve / Reject |
| After approve | Modal or inline: “One-time code: `XXXXXX` — share with the user. Shown once.” |

Optional: filter or history below the pending list.

---

## 8. API requirements (conceptual — implement later)

| Method | Path (example) | Auth | Purpose |
|--------|----------------|------|---------|
| `POST` | `/api/auth/forgot-password` | Public | Body: `{ "username" }` → always generic success |
| `POST` | `/api/auth/reset-password` | Public | Body: `{ "username", "code", "newPassword" }` |
| `GET` | `/api/admin/password-resets?status=pending` | Admin | List requests |
| `POST` | `/api/admin/password-resets/:id/approve` | Admin | Approve; response includes **one-time raw code once** |
| `POST` | `/api/admin/password-resets/:id/reject` | Admin | Reject; optional `{ "reason" }` |

**Code format (recommendation):** 6–8 digit numeric or 8-character alphanumeric, generated with CSPRNG; store only hash.

---

## 9. Non-functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **PWR-NFR-01** | Codes transmitted only over HTTPS in production. | Must |
| **PWR-NFR-02** | Raw code appears in admin API/UI **only** in the approve response (not in list endpoints). | Must |
| **PWR-NFR-03** | Failed resets do not lock the user out of requesting again after reject/expiry (subject to rate limits). | Should |
| **PWR-NFR-04** | Frontend must not log codes or passwords. | Must |

---

## 10. Out of scope (v1)

- Email or SMS delivery of the code  
- Admin setting the user’s password directly  
- Self-service reset without admin  
- Multi-step identity quiz beyond username + code  
- Automatic notification channels (push, Telegram bots, etc.)  

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Admin delayed | Expected for small app; communicate to users |
| Admin leaks code in chat | Short expiry + one-time use |
| Attacker spams forgot-password | Rate limit + generic responses |
| Admin approves wrong person | Admin knows usernames; confirmation on approve |
| User never receives code | Admin responsibility to deliver OOB |

---

## 12. Acceptance criteria (v1 done when)

- [ ] User can submit forgot-password by username with generic success message  
- [ ] Admin sees pending requests and can approve/reject  
- [ ] Approve shows one-time code once; list APIs do not return raw codes  
- [ ] User can set new password with username + code before expiry  
- [ ] Code cannot be reused; expired codes fail  
- [ ] Passwords never shown to admin; hashes never returned to clients  
- [ ] Documented in this SRS; implementation on `dev` then PR to `main` when ready  

---

## 13. Implementation order (when coding is approved)

1. Migration / table `password_reset_requests`  
2. `POST /api/auth/forgot-password`  
3. Admin list + approve/reject APIs  
4. `POST /api/auth/reset-password`  
5. User pages: forgot + reset  
6. Admin dashboard section  
7. Rate limiting + polish  

Implementation lives on `dev` (user pages + admin section + APIs).

---

## 14. Open decisions

| # | Question | Default if not decided |
|---|----------|------------------------|
| 1 | Code length / format? | 6-digit numeric |
| 2 | Expiry after approve? | 30 minutes |
| 3 | Supersede vs block second pending request? | Supersede (cancel old pending) |
| 4 | Show expense count on admin user list next to reset? | Optional, unrelated |

---

## 15. Change log

| Date | Change |
|------|--------|
| 2026-07-20 | Initial draft: admin-approved reset, one-time code, integrity rules, APIs, UI, acceptance criteria |
| 2026-07-20 | Implemented on `dev`: forgot/reset pages, admin pending list + approve/reject, `password_reset_requests` table |
