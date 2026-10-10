# Security Reference (central)

Single entry point for how Expense Tracker protects accounts and money data. Existing detail docs stay where they are — this page links to them. Start here when you touch auth, secrets, storage, or Play Store answers.

| Detail lives in | Covers |
|-----------------|--------|
| [database.md](./database.md) | Schema, bcrypt note, `user_id` isolation |
| [api.md](./api.md) | Endpoint auth requirements, status codes |
| [development.md](./development.md) | Local env vars, safe-testing warning |
| [deployment/architecture.md](./deployment/architecture.md) | Prod layout, Security Notes |
| [deployment/render-migration.md](./deployment/render-migration.md) | Env var tables for Render/Railway |
| [deployment/capacitor-android-plan.md](./deployment/capacitor-android-plan.md) | Native shell plan (branch `feature/mobile-capacitor-plan`) |
| [srs/password-reset-admin-approval.md](./srs/password-reset-admin-approval.md) | Reset integrity principles (§4) |
| [srs/playstore-data-safety.md](./srs/playstore-data-safety.md) | Safety-first hardening checklist (ENC/TLS/AUTH/LOG/STORE/PLAY/OPS/MOB) |

---

## 1. Passwords — hashed, not encrypted

One-way **bcrypt** via `bcryptjs`, cost factor **10**. Hashes are never returned by any API. A DB leak exposes `$2a$10$…` strings only — verification is `bcrypt.compare()` per login, never decryption.

| What | Where hashed | Where verified |
|------|--------------|----------------|
| `users.password` | `backend/models/User.js:41` `bcrypt.hash(password, 10)` on register; `backend/routes/auth.js:217,307` on change/reset | `backend/routes/auth.js:120,209,300`, `User.comparePassword` (`models/User.js:111-116`) |
| `admins.password` | `backend/models/Admin.js:40` on env seed | `backend/routes/admin.js:41` |
| Reset one-time code | `backend/models/PasswordResetRequest.js:106` (6-digit CSPRNG `crypto.randomInt`, 30-min expiry, single-use via `used_at`) | `backend/routes/auth.js:300` |

Policy today: username ≥ 3 chars, password ≥ 6 chars (`routes/auth.js:29,33,187,287`). Forgot-password always returns the same generic message whether the username exists (`routes/auth.js:235-236`) — no account enumeration. See also [srs/password-reset-admin-approval.md](./srs/password-reset-admin-approval.md) §4.

> Planned upgrades live in the Play SRS, not here: min 10 chars + breach check (AUTH-03), separate user/admin secrets + short-lived rotation (AUTH-01/02) — see [srs/playstore-data-safety.md](./srs/playstore-data-safety.md) §4B.

## 2. Sessions (JWT)

* Library: `jsonwebtoken`. Secret: `JWT_SECRET` (server env only — never in repo/bundle/logs).
* Payloads: user `{ userId }`, admin `{ adminId, role:'admin' }`. Lifetime: **1h** both (`routes/auth.js:68,128`, `routes/admin.js:51`). Note: `JWT_EXPIRE=24h` in `.env.example` is currently unused by code — treat 1h as truth until AUTH-02 ships.
* Enforcement: `backend/middleware/auth.js` (user), `backend/middleware/adminAuth.js` (requires `role==='admin'` — user tokens cannot call admin APIs).
* Client: user token in `localStorage` (remember-me) else `sessionStorage`; admin token in `sessionStorage` only (`frontend/src/utils/authStorage.js`, `adminStorage.js`, attached in `services/api.js` interceptor). Native migration to encrypted storage is pending — see §7.

## 3. Authorization

* Every expense query filters by `user_id` from the verified JWT (`docs/database.md` §`expenses`, `routes/expenses.js`). Users cannot read/write others' rows.
* Admin APIs (`/api/admin/*`) require admin JWT; admin UI (`/admin/login`, `/admin`) is not linked from the user app (`frontend/src/App.js:49-51`, [srs/admin-panel.md](./srs/admin-panel.md)).
* Admin Bootstrap: `ADMIN_USERNAME`/`ADMIN_PASSWORD` seed `admins` once on first boot **if missing** (`models/Admin.js:14-46`); changing `.env` later does not overwrite the DB row — reset via SQL `UPDATE` instead.

## 4. Transport

* Browser ↔ API: HTTPS in prod (Vercel/Render/Railway TLS). `frontend/src/config.js` defaults to `http://localhost:5000/api` for local only — prod must set `REACT_APP_API_URL` to `https://…/api`.
* CORS: `backend/server.js:9-35` — permissive when `NODE_ENV=development`, strict allow-list from `CORS_ALLOWED_ORIGINS` in production (exact origins, no trailing slash). Capacitor builds also need `capacitor://localhost` (+ `https://localhost`); never ship LAN-test IPs in release.
* API ↔ DB: `backend/config/db.js` — `mysql2` pool over SSL to Aiven. **Gap:** `rejectUnauthorized:false` today — must become `true` with real `DB_CA_CERT` (TLS-01).
* Headers: no `helmet()` yet (TLS-02). Error middleware (`server.js:67-74`) returns `err.message` — keep messages generic so SQL/stack never reaches clients (LOG-01).

## 5. Secrets inventory

| Secret | Lives in | Rules |
|--------|----------|-------|
| `JWT_SECRET` | Backend env (local `backend/.env`, prod dashboard) | ≥32 random chars; distinct per env; rotate by overlapping acceptance window |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Backend env, first-boot seed only | Strong (≥12); prod copy in dashboard even though login reads the DB |
| `DB_HOST/USER/PASSWORD/NAME/PORT/CA_CERT` | Backend env | Never in frontend; Aiven creds only on hosting dashboard in prod |
| `LLM_PROVIDER`, `LLM_*_API_KEY` (`GEMINI/COHERE/OPENAI/DEEPSEEK`), `VOICE_ALLOW_MOCK` | Backend env (`backend/.env.example`, `services/voice/*`) | Server-only; `VOICE_ALLOW_MOCK=false` in prod (fail closed); one prod provider only (D-6) |
| `ENC_KEY` / `ENC_KEY_ID` | Backend env/KMS only (local `.env` + prod secrets since 2026-10-10) | 32B base64, versioned (`enc_v`), dev key ≠ prod key (ENC-05). Offline backup mandatory — loss = data loss |
| `EMAIL_HMAC_PEPPER` | Backend env only (local `.env` + prod secrets needed) | 32B base64 blind-index pepper (ENC-02). Same backup rule as `ENC_KEY` |
| `REACT_APP_API_URL` | Frontend build-time env (local `.env`, Vercel settings) | Rebuild after change; prod = `https://<backend>/api` |

All `.env` files are gitignored — only `*.example` is committed. If a real secret ever lands in git, rotate it immediately (OPS-03).

## 6. Validation & abuse control

* Auth/expenses: hand-rolled length/enum checks (`routes/auth.js`, `routes/expenses.js`) — being replaced by zod schemas following the voice pattern `services/voice/schema.js` (`voiceDraftRequestSchema`, AUTH-05).
* Rate limiting: `middleware/voiceRateLimit.js` (voice 10/min) + **`middleware/rateLimit.js` since 2026-10-10 (on `dev`, AUTH-04):** login 10/15min per IP+account, admin 5/15min/IP, register 5/hr/IP, forgot 5/hr per user+IP, reset 10/hr/IP — generic 429 + `Retry-After`, live-verified. Single-process store (needs Redis if multi-instance).
* Uploads: none. No `REQUEST_INSTALL_PACKAGES` or extra Android permissions beyond `INTERNET` + `RECORD_AUDIO`.

## 7. Storage, logs, device

* Web: tokens in WebView `localStorage`/`sessionStorage` (XSS-theft risk — the reason for STORE-01). After Capacitor migration: tokens → secure-storage plugin (EncryptedSharedPreferences/Keychain); `@capacitor/preferences` (already installed on the mobile branch) is **unencrypted** — theme/lang only.
* Android shell (branch `feature/mobile-capacitor-plan`): `appId com.shaminda.expensetracker`, `allowBackup="true"` today → must become `false` + backup rules before release (MOB-01); `cleartextTrafficPermitted=false` (TLS-01); `RECORD_AUDIO` with EN/SI/TA rationale, no background recording (MOB-03).
* Logs: never log passwords, tokens, amounts, descriptions, emails, transcripts, prompts, SQL params, or API keys (LOG-01). **Fixed 2026-10-10 (#36–38, on `main`):** bearer-token/header logs dev-gated, SQL-param logs dev-gated, full error objects trimmed to messages, `list-users` excludes hashes. Remaining: transcript/LLM prompt redaction (ENC-07). Server logs retained ≤ 30 days (OPS-01).

## 8. Data at rest — what is / isn't protected

| Data | Today | Direction (see Play SRS §4A) |
|------|-------|------------------------------|
| Passwords, reset codes | bcrypt ✅ | Keep |
| `expenses.description` | **AES-256-GCM ✅ since 2026-10-10 (PR #42)** — `temp_*` + `enc_v`, 132/132 backfilled, dual-read w/ legacy fallback until MIG-05 | Keep; drop legacy per MIG-05 |
| `users.email` | **AES-256-GCM + HMAC blind index ✅ since 2026-10-10 (on `dev`)** — `temp_*` + `email_hmac`, 4/4 backfilled, login via username/email verified | Keep; drop legacy per email MIG-05 |
| `request_ip`, `reject_reason` | Plaintext ⚠️ | Minimization/TTL + structured enum (ENC-03–04) |
| `expenses.amount` | Plaintext (needed for `SUM()`) | **Stays plaintext v1** by decision D-1, compensated by TLS + no-logging + isolation (ENC-06) |
| Voice transcripts | In-memory + LLM call, no retention policy yet | Minimize prompt (no username/email), no persist, confirm provider zero-retention (ENC-07, D-6) |
| Backups | Aiven encrypted ✅ / manual dumps unknown ⚠️ | GPG-encrypt any manual dump; test restore (OPS-02) |

## 9. Accounts, deletion, retention

* Admin can delete any user (cascade wipes expenses + reset rows). **Users can self-delete since 2026-10-10 (on `dev`, PLAY-01):** `DELETE /api/auth/me` with password confirm → same cascade (verified 0 orphans); UI in Account danger zone; deletion URL for Data Safety still needs hosting (PLAY-02).
* Retention targets: reset rows 90d, logs 30d, voice artifacts 30d, expenses until user deletes (OPS-01, privacy policy).

## 10. Play Store mapping (summary — full checklist in Play SRS §4D/F)

Data Safety must declare: financial info (amount/description), personal info (username/email/transcript), microphone (foreground only), app activity, device IDs; **sharing includes the chosen LLM provider + infra hosts**; encryption in transit yes; deletion URL yes. Binary: Capacitor `aab`, latest `targetSdk`, 64-bit, Play App Signing, versionCode bump, internal track → pre-launch clean.

## 11. Known gaps (do not ship store build until P0+P1 land)

**Fixed 2026-10-10 (PR #40/#42 on `main`, ENC-02 + PLAY-01 on `dev`):** bearer-token logging, hash-dumping script, SQL-param logs, PUT/DELETE 500 crash, description + email at rest, 61 duplicate `email_N` keys, user self-delete. Still open: `rejectUnauthorized:false` · no `helmet` · auth rate limits missing · 6-char passwords + shared JWT secret + 1h tokens · plaintext IP/reason · `allowBackup=true` · tokens in WebView storage · voice provider/sharing undecided · no self-delete · ISO-`Z` date 500 (#41). Each has an ID in [srs/playstore-data-safety.md](./srs/playstore-data-safety.md) §4.

## 12. Runbook (common tasks)

* **Reset admin password:** `bcrypt.hash(newPwd,10)` → `UPDATE admins SET password=? WHERE username='admin'`; keep `backend/.env` in sync for future seeds.
* **Rotate JWT secret:** set new value in prod dashboard, redeploy, old tokens expire within 1h.
* **Verify prod admin:** `POST https://<backend>/api/admin/login` → expect `token`; then open `https://<frontend>/admin/login`.
* **Pre-release grep:** `amount|description|transcript|prompt|Bearer|API_KEY|BEGIN` must return nothing in prod logs/build (acceptance §5).

---

*Changelog: v1 created 2026-10-10 as security focus kickoff. v2 same day: ENC-01/MIG-01–04 shipped (PR #42, description encrypted, 132/132 backfilled), #36–38 log fixes on `main`, PUT/DELETE crash fixed, #39/#41 left open. v3 same day: ENC-02 shipped on `dev` (email encrypted + HMAC index, 4/4 backfilled, logins verified), 61 duplicate `email_N` keys dropped. v4 same day: PLAY-01 shipped on `dev` (`DELETE /api/auth/me`, cascade verified, trilingual danger-zone UI). v5 same day: AUTH-04 shipped on `dev` (hardcoded limits, live-verified trip points). Forward roadmap in [srs/playstore-data-safety.md](./srs/playstore-data-safety.md).*
