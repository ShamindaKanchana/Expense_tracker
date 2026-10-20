# SRS: Play Store Data Safety — Encryption & App Hardening

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Play Store readiness with safety-first data protection (not checkbox compliance) |
| **Status** | **Draft v2 + shipped ENC-01/MIG-01–04 (2026-10-10, PR #42 on `main`)** — review before Play submission |
| **Depends on** | [admin-panel.md](./admin-panel.md), [password-reset-admin-approval.md](./password-reset-admin-approval.md), [voice-expense-input.md](./voice-expense-input.md) |
| **Related docs** | [database.md](../database.md), [api.md](../api.md), [deployment/architecture.md](../deployment/architecture.md), [deployment/capacitor-android-plan.md](../deployment/capacitor-android-plan.md) |
| **Goal** | Protect financial + identity + voice data even if DB leaks, logs leak, device is lost, or API is probed — then satisfy Play Data Safety / account-deletion rules as a consequence |

> Scope note: this SRS is **safety-first**, not "minimum to pass review". Each item states the real risk, then maps to the Play requirement it also satisfies. v2 accounts for the real mobile shell on `feature/mobile-capacitor-plan` (not the "no capacitor" assumption in v1).

---

## 1. Current state audit (2026-10-10, `dev` @ 07da124 + `feature/mobile-capacitor-plan`)

### 1.1 Already protected ✅

| Field | Protection | Source |
|-------|-----------|--------|
| `users.password` | bcrypt(10) hash, never returned by API | `backend/models/User.js:41` |
| `admins.password` | bcrypt(10) hash | `backend/models/Admin.js:40` |
| `password_reset_requests.code_hash` | bcrypt(10) of 6-digit code, single-use, 30-min expiry | `backend/models/PasswordResetRequest.js:106` |
| Forgot-password form | Generic message, no account enumeration | `backend/routes/auth.js:235-236` |
| Expense isolation | All queries filter `user_id` from JWT | `docs/database.md` |
| Voice endpoint (new) | Auth required, zod schema (`voiceDraftRequestSchema`), dedicated `voiceRateLimit`, mock forbidden in prod (`VOICE_ALLOW_MOCK`) | `backend/routes/voiceExpenses.js`, `backend/services/voice/schema.js`, `backend/middleware/voiceRateLimit.js` |
| Capacitor shell (new, on branch) | `appId com.shaminda.expensetracker`, `webDir build`, `homepage ./`, native STT fallback via `@capacitor-community/speech-recognition` | `frontend/capacitor.config.ts`, `frontend/android/`, `VoiceExpenseInput.jsx` (branch `feature/mobile-capacitor-plan`) |

### 1.2 Sensitive but plaintext ⚠️ — the reason for this SRS

| # | Field / store | Type | Risk if leaked | Today |
|---|---------------|------|----------------|-------|
| S-1 | `expenses.description` (TEXT) | Free text — health, account nos, locations, names | Highest. Financial + personal notes in one column | **Encrypted since 2026-10-10 (PR #42):** AES-256-GCM `temp_*` + `enc_v`, 132/132 backfilled, dual-read with legacy fallback; legacy column retained until MIG-05 |
| S-2 | `expenses.amount` (DECIMAL) | Financial behavior profile | Profiling, extortion | Plaintext (required for `SUM()` — see §3 D-1) |
| S-3 | `users.email` (VARCHAR, UNIQUE) | PII, login identifier | Phishing, identity link | **Encrypted since 2026-10-10 (ENC-02):** AES-256-GCM `temp_*` + `email_hmac` blind index, 4/4 backfilled, login via username/lower/UPPER email verified; legacy retained until MIG-05-style email cleanup |
| S-4 | `password_reset_requests.request_ip` | PII, location-ish | Tracks user network | Plaintext, no retention/TTL |
| S-5 | `password_reset_requests.reject_reason` | Free text by admin | May contain personal data | Plaintext, indefinite |
| S-6 | JWT (`localStorage` user, `sessionStorage` admin) | Session bearer | WebView/ADB/Log theft → full takeover | **Still `localStorage`/`sessionStorage`** (`frontend/src/utils/authStorage.js`); `@capacitor/preferences` installed on mobile branch but **migration not done** — and Preferences is **unencrypted** anyway |
| S-7 | Server logs | `auth.js` logged decoded tokens; `Expense.js` logged amounts/descriptions; error handler returns `err.message` (can include SQL) | Log aggregator / Render logs become a data store | **Partially fixed 2026-10-10 (#36–38):** bearer-token/header logs gated dev-only, SQL-param logs gated dev-only, full error objects trimmed to messages, `list-users` no longer dumps hashes. Remaining: transcript/LLM prompt redaction (ENC-07), HSTS/helmet |
| S-8 | Transport gaps | No `helmet`, general auth rate-limit still missing (voice only), `rejectUnauthorized:false` on Aiven SSL, same `JWT_SECRET` for user+admin, min password 6 chars, JWT 1h with no rotation | MITM / brute-force / token reuse | Confirmed in `server.js`, `config/db.js`, `routes/auth.js` |
| S-9 | Delete path | Only admin can delete a user (`DELETE /api/admin/users/:id`); user cannot self-delete | Violates **Play account-deletion policy** (must offer in-app deletion) and GDPR erasure | By design in `admin-panel.md` |
| S-10 | **Voice transcripts (new)** | Spoken expense text + locale + timezone → `POST /api/voice-expenses/draft` → forwarded to **third-party LLM** (Gemini / Cohere / OpenAI-compatible / DeepSeek per `LLM_PROVIDER`) | Same sensitivity as S-1, **plus new subprocessor sharing**; `LLM_*_API_KEY` are new high-value secrets; prompt/logs may retain PII | Transcript-only (STT on device/browser, no audio upload — verify and lock this); no transcript retention policy yet; provider logging unknown |
| S-11 | **Android backup (new)** | `android:allowBackup="true"` in branch `AndroidManifest.xml` | `adb backup` / auto-backup extracts WebView `localStorage` → JWTs + cached expenses leave the device in clear | `true` today; no backup rules file |
| S-12 | **CORS widening (new)** | Capacitor plan adds `capacitor://localhost`, `http://localhost`, `https://localhost`, LAN IP to `CORS_ALLOWED_ORIGINS` | Overly broad allow-list + `NODE_ENV=development` (allow-all) accidentally left on in a device-test build | Plan-doc stage; must be exact-origin in release |

### 1.3 Packaging reality (v1 "gap" now resolved in direction, not in `main`)

Capacitor is **decided and built on `feature/mobile-capacitor-plan`** (`frontend/android/` shell, app icons/splash, `RECORD_AUDIO` + `INTERNET` permissions, `capacitor.config.ts`). It is **not yet merged to `main`/`dev`**. Remaining gaps before Play: §§ MOB-01–07 below (backup rules, secure storage, mic rationale, versionCode/signing, release API URL).

---

## 2. Threat model (what we defend against)

| Attacker | Capability | SRS must hold |
|----------|-----------|---------------|
| DB dump reader (SQL leak, stolen backup, ex-admin) | Reads all tables | S-1/S-3/S-4 unreadable without app key |
| Log scraper (Render/Railway logs, `console.log`) | Reads logs | No amounts, descriptions, emails, tokens, transcripts, SQL in logs |
| Network observer (open WiFi, proxy) | Sniffs HTTP | TLS-only, HSTS, no HTTP fallback, no cleartext WebView traffic |
| XSS / malicious browser ext / rogue WebView JS | Runs JS in origin | Short-lived access token, no long secrets in plain WebView storage |
| Lost/stolen phone / `adb backup` | Reads app files + backups | Tokens in encrypted storage, `allowBackup=false` + rules, optional app-lock |
| Abusive client | Brute-forces login/reset/voice | Rate limits + lockout on all public routes, no enumeration |
| Curious admin | Browses DB | Sees minimum; sensitive columns encrypted, reason codes not free text |
| LLM subprocessor | Receives transcripts | Minimal prompt (no username/email), no logging retention, DPA in place |

Out of scope: rooted-device OS compromise, Aiven disk theft (covered by Aiven AES-256 + our column encryption as second layer).

---

## 3. Key decisions (record before coding)

| # | Decision | Options | Recommendation / status |
|---|----------|---------|------------------------|
| D-1 | `amount` encryption? | A) Keep plaintext + TLS + Aiven disk encryption; B) Deterministic AES-SIV | **A for v1** — document explicitly; encrypt `description` + `email` + `ip` instead |
| D-2 | Encryption primitive | AES-256-GCM per-row vs libsodium sealed box | **AES-256-GCM, `ENC_KEY` 32B, columns `*_enc` + `*_iv`, `enc_v INT`**; key via env/KMS, versioned rotation |
| D-3 | Search on encrypted columns? | HMAC index vs no search | **No search on `description` v1**; HMAC index on `email` only if email-login kept |
| D-4 | Native wrapper | Capacitor vs TWA | **RESOLVED: Capacitor** — shell exists on `feature/mobile-capacitor-plan`; merge + harden per §4F |
| D-5 | User self-delete | `DELETE /api/auth/me` vs admin-only | **Add self-delete** (Play requires it); keep admin delete |
| D-6 | Voice LLM provider + data sharing | Gemini / Cohere / OpenAI-compatible / DeepSeek / mock | **DECIDED 2026-10-11: Cohere in prod** (`LLM_PROVIDER=cohere`, model per `LLM_MODEL` on Render, `VOICE_ALLOW_MOCK=false` confirmed, timeout 15s / retries ≤2). Prompt sends transcript+locale+timezone only (no username/email/userId — verified `prompt.js`); mock fails closed in prod. **Cohere terms recorded 2026-10-13:** prompts kept **30 days by default** (Zero Data Retention = approved enterprise only); **training opt-out ("Data Controls" toggle) is ABSENT on free tier — free prompts are opt-IN to model improvement by default (confirmed 2026-10-13)**; DPA for GDPR/enterprise via **privacy@cohere.com** (unavailable on free). Privacy + Data Safety must state possible training use until plan upgrade. **Decision 2026-10-13: keep Cohere as default with user disclosure (in-app hint + policy) and typing fallback; on-device offline mode deferred unless reviewers/parents push back** |

---

## 4. Requirements checklist

Tick `[x]` when shipped + verified. IDs are stable for branch references.

### A — Column-level encryption (the "some fields" you heard about)

- [x] **ENC-01 `expenses.description` encrypted at rest — SHIPPED 2026-10-10 (PR #42).** Columns `temp_description_enc TEXT, temp_description_iv VARCHAR(32), enc_v INT` live; `utils/fieldCrypto.js` (AES-256-GCM, per-row IV, key from `ENC_KEY`); dual-write on save, dual-read with legacy fallback, ciphertext stripped from API responses; backfill 132/132 verified decrypt-match, 0 remaining `enc_v=0`. Legacy `description` retained until MIG-05. *Play maps to: Data Safety "Financial info + Personal info — encrypted in transit and at rest".*
- [x] **ENC-02 `users.email` encrypted at rest — SHIPPED 2026-10-10.** Same envelope (`temp_email_enc`, `temp_email_iv`) + `email_hmac` blind index for uniqueness/login (NULLs stay NULL); dual-write/read with legacy fallback; backfill 4/4, 9/9 verified; email-login kept (no behavior change). Bonus: fixed boot loop creating 61 duplicate `email_N` keys (dropped, `initTable` idempotent).
- [x] **ENC-03 `request_ip` minimized — CODE SHIPPED 2026-10-20; prod backfill pending run.** Chose /24 (IPv4) + /48 (IPv6) truncation over salted HMAC (no key mgmt; abuse attribution preserved). `PasswordResetRequest.minimizeIp()` applied on every insert; unrecognized values dropped to NULL; IPv4-mapped IPv6 handled. Never returned to admin UI (was already omitted from `listPending`/all routes). Auto-purge: 90d via OPS-01. **One-time backfill** for existing rows: `node scripts/backfill-request-ip-minimization.js` (re-runnable, `--dry-run` supported) — run once against prod, then confirm 0 raw-length IPs remain.
- [x] **ENC-04 `reject_reason` structured — CODE SHIPPED 2026-10-20; prod migration pending run.** Enum column `reject_reason_code` (`invalid_user`, `duplicate`, `abuse`, `other`, `superseded`; unknown → `other`); optional note ≤140 chars stored AES-256-GCM-encrypted in `reject_reason` (ENC-01 envelope, requires `ENC_KEY`). `initTable` converges the new column on existing DBs; supersede path now writes code only. Admin reject route validates `{code, note}`; UI unchanged (sends nothing → `other`, no note — picker is optional follow-up). Backfill for legacy plaintext rows: `node scripts/migrate-reject-reason.js` (re-runnable, `--dry-run` supported) — **run once against prod after ENC_KEY is set**. Purged with row at 90d (OPS-01).
- [ ] **ENC-05 Key management.** `ENC_KEY` (base64 32B) + `ENC_KEY_ID` from **server env/KMS only** — never repo/frontend/logs. Rotation: `enc_v=2` rows, background re-encrypt, old key read-only 30 days. Dev key ≠ prod key.
- [x] **ENC-06 `amount` explicitly NOT encrypted v1 — RECORDED 2026-10-20.** Rationale: monthly/yearly reports need SQL aggregation (`SUM()` in `backend/models/Expense.js getMonthlySummary`); plaintext DECIMAL is required for that in v1. Compensations, each verified in code 2026-10-20: amounts never in URLs (query params are year/month/page only, `routes/expenses.js`); no amount/description in prod logs (`Expense.js` sensitive logs dev-gated; summary logs userId/year/month only; admin logs admin-id/username/id only); client errors return generic `err.message` without amounts (`server.js`); admin API never returns expense amounts (admin routes cover users + password-resets only). Transport: TLS (HSTS leg tracked in TLS-01); Aiven AES-256 disk encryption at rest (provider default — owner confirms in dashboard, OPS-02).
- [x] **ENC-07 Voice transcripts minimized + not persisted — RE-VERIFIED 2026-10-20.** `prompt.js` sends only transcript+locale+timezone+localDate (no username/email/user_id — re-checked); draft endpoint persists nothing (no DB insert in `routes/voiceExpenses.js`); voice service + providers contain zero `console` logging; route logs `error.message` only; LLM request/response excluded from logs. Cohere retention recorded 2026-10-13 (30-day default; **training opt-out absent on free tier — assume prompts may be used for model improvement**; disclosed in privacy voice paragraph + PLAY-02).

### B — Transport & API hardening

- [x] **TLS-01 HTTPS everywhere — SHIPPED 2026-10-20 (server legs).** `app.set('trust proxy', 1)` + HSTS via helmet (`max-age=31536000; includeSubDomains; preload`) — verified live on responses. HTTP→HTTPS redirect is Render-edge behavior (platform terminates TLS and redirects; not visible to the app). DB leg ✅ since 2026-10-11 (`c7581ca`, `rejectUnauthorized:true` + real `DB_CA_CERT`). WebView `usesCleartextTraffic=false` ✅ on mobile branch (MOB-01). **Owner verify on prod after deploy:** `curl -sI https://<render-url>/` shows the HSTS header.
- [x] **TLS-02 Security headers — SHIPPED 2026-10-20.** `helmet()` with explicit HSTS config in `server.js` (nosniff, frameguard, referrer-policy, COOP/CORP, etc.) — verified live locally. API returns JSON only; SPA assets are served by Vercel / loaded from the Capacitor origin, so helmet's default CSP cannot break CRA/Recharts. **Re-verify inside Capacitor WebView after MOB-06 merge** (fingerprint: response headers on an API call from the app).
- [x] **AUTH-01 Separate secrets — SHIPPED 2026-10-20 (code; Render env pending).** `config/jwt.js`: user tokens sign/verify with `JWT_USER_SECRET`, admin with `JWT_ADMIN_SECRET` (legacy `JWT_SECRET` fallback keeps deploy unbroken). Middleware split: user token cannot validate on admin routes even with `role` forged, and vice versa; `role:'admin'` check retained. Rotation = swap the env var on Render → old tokens 401 → clients re-login; admin rotates independently. **Owner: add both new secrets to Render env, then drop `JWT_SECRET`.**
- [x] **AUTH-02 Token lifetime — SHIPPED 2026-10-20.** Access tokens **15 min** (`exp-iat=900s` verified live) for users; **admin 15 min, no refresh/remember-me** (re-auth on expiry). Sessions carried by rotating refresh tokens: opaque 32B, SHA-256-hashed in new `refresh_tokens` table (FK-cascade on user delete), 30-day expiry (`REFRESH_TOKEN_EXPIRY_DAYS`), httpOnly+Secure+SameSite=None cookie scoped to `/api/auth` (works from Vercel site and Capacitor WebView; localhost counts as secure context). Rotation on every `/auth/refresh`; **reuse of a rotated token = theft → all user sessions revoked** (live-verified: replay 401 + subsequent cookie also dead). Logout revokes server-side; password change/reset revoke all sessions. Frontend: silent refresh interceptor on 401 (single retry, loop-guarded), boot-time restore from cookie, logout calls `/auth/logout`. Purged >90d by OPS-01. Retires 1h/24h lifetimes. **Web note:** short access token still mirrored in localStorage/sessionStorage for reload continuity — moving it to memory-only + full native secure storage is STORE-01/MOB-02.
- [x] **AUTH-03 Password policy — SHIPPED 2026-10-20.** Min length raised 6→**10** (zod `passwordSchema`, all of register / change-password / reset-password). Breach-list check via HIBP k-anonymity range API (`utils/breachCheck.js`) on register, change-password, and reset — only SHA-1 prefix leaves the server; 5s timeout, **fail-open** (availability over strictness, gap logged). `current≠new` rule extended to reset-password flow (was change-password only). Existing 6-char accounts still work until they next change a password.
- [x] **AUTH-04 Rate limits + lockout — SHIPPED 2026-10-10 (merged to `main` via PR #44).** Zero-dep factory `middleware/rateLimit.js` (voice pattern): login 10/15min per IP+account, admin 5/15min per IP, register 5/hr/IP, forgot 5/hr per user+IP, reset 10/hr/IP. Generic 429 + `Retry-After`, no credential logging. Live-verified exact trip points; single-instance note in code.
- [x] **AUTH-05 Validation — SHIPPED 2026-10-20.** zod schemas on every JSON body, following the voice pattern: auth (register/login/forgot/reset/change-password/delete), admin (login, password-reset reject), expenses (create/update). Bounds enforced: username `^[a-zA-Z0-9_.]{3,30}`, amount `0–1e9` ≤2dp, description ≤500, category enum, `.strict()` (unknown keys rejected). Uniform 400 `{code:'REQUEST_INVALID'}` — no zod internals/stack/SQL to client. Smoke-verified live (short-password + bad-amount + extra-key all rejected).
- [x] **AUTH-06 LLM secrets — RE-VERIFIED 2026-10-20.** Keys read from server env only (`process.env` in `services/voice/providers`); no key material in repo (secret scan of `main`/`dev` clean), frontend, or build (frontend only has `LLM_*` i18n error strings); `.env` gitignored, 0 tracked env files; `VOICE_ALLOW_MOCK` fails closed — mock forbidden when `NODE_ENV=production` OR flag not `'true'` (`providers/index.js:21`); provider timeout/retry capped (default 15000ms, retries ≤2 in `httpClient.js`, overridable via `LLM_TIMEOUT_MS`). *Last Render dashboard re-check: 2026-10-11 — re-confirm env values at release (MOB-04/OPS-03).*

### C — Logs, storage, client

- [x] **LOG-01 No sensitive logs — SHIPPED 2026-10-10 (#36–38) + 2026-10-20.** SQL-param/decoded-token/bearer/header logs dev-gated (`middleware/auth.js`, `models/Expense.js`); no transcripts/LLM prompts in logs (voice service + providers have zero console logging, route logs `error.message` only — ENC-07). 2026-10-20: removed raw `err.message`/`error.message` from **all** client error responses (`server.js` global handler now generic for 5xx in prod, 4xx messages kept; `routes/expenses.js` 11 sites; `middleware/auth.js` invalid-token response) — no stack/SQL to clients. Remaining console output is IDs/usernames/result codes or dev-gated.
- [ ] **STORE-01 Token storage (mobile-corrected).** `@capacitor/preferences` is **not encrypted** — do NOT store JWT there as final state. Use a secure-storage plugin (EncryptedSharedPreferences / Keychain) for tokens; Preferences only for theme/lang. Web: short access in memory + httpOnly refresh cookie. **Nothing long-lived in plain WebView `localStorage`.**
- [ ] **STORE-02 Logout hygiene.** Clears WebView + secure storage + server-side refresh revocation; admin tab-close behavior preserved.
- [ ] **APP-01 App lock (Should).** PIN/biometric (`@capacitor/biometrics`) gating display; 3-strike local token wipe.

### D — Play Store account, data & release gates

- [x] **PLAY-01 In-app account deletion — SHIPPED 2026-10-10 (on `dev`).** `DELETE /api/auth/me` (password confirm, 400-not-401 on mismatch so session survives); cascade verified (0 orphans); Account danger zone as a modal message box (backdrop, Esc/backdrop close, autofocus, EN/SI/TA, mobile+desktop); post-delete notice on login screen. Admin delete retained.
- [ ] **PLAY-02 Data Safety form truth (mobile-corrected).** Declare: Financial info (amount, description), Personal info (username/email/transcript), **Microphone (foreground voice input — not background)**, App activity, Device IDs; purposes: App functionality + Fraud prevention; **sharing: Cohere (voice transcript/locale/timezone for extraction — D-6 decided 2026-10-11) + infra (Aiven/Render)** — not "no sharing"; encryption in transit: yes; deletion: yes (PLAY-01).
- [ ] **PLAY-03 Privacy policy.** Hosted URL (in-app + listing): source text drafted at `docs/privacy-policy.md` (2026-10-13 — still needs a public host + in-app link; fill in the bracketed contact/date fields before publishing). Approved voice paragraph (2026-10-13, also shown as in-app mic hint `voice.privacyHint` EN/SI/TA — **SI/TA owner-verified 2026-10-13 (Gemini-reviewed, merged via PR #46)**): *"Voice input: your speech is transcribed on your device and the resulting text plus app locale and timezone are sent to Cohere solely to extract the expense details. We do not send your username, email, or account ID. Cohere retains prompts for 30 days by default and, on our free tier with no opt-out, prompts may be used for model improvement. Transcripts are not stored on our servers beyond processing the request. Typing works without voice."*
- [ ] **PLAY-04 Binary readiness (mobile-corrected).** Merge mobile branch; `targetSdk` = latest required, 64-bit, versionCode bump, Play App Signing, permissions = `INTERNET` + `RECORD_AUDIO` only (with rationale string — voice expense input); no `REQUEST_INSTALL_PACKAGES`.
- [ ] **PLAY-05 Pre-launch.** Internal track → pre-launch report clean (no cleartext, no weak crypto, mic disclosure OK); Data Safety + deletion URL verified; SI/TA screenshots; content rating done.

### E — Retention & ops

- [x] **OPS-01 Retention job — SHIPPED 2026-10-20 (code) / platform-confirm pending.** `scripts/purge-retention.js` deletes `password_reset_requests` rows > 90d (removes `request_ip`/`reject_reason`/`code_hash` with the row; `--dry-run` supported); scheduled nightly ~03:00 by `server.js` (disable: `RETENTION_JOB=false`). Codes already expire in 30 min. Logs = stdout-only, 30d retention is Render-dashboard-side (**owner: confirm log-retention setting in Render**). Voice: nothing persisted (ENC-07) — >30d rule is a written guarantee. Documented in `database.md` § Retention & purge.
- [ ] **OPS-02 Backup encryption.** Aiven backups encrypted; manual dumps GPG-encrypted; restore tested.
- [ ] **OPS-03 Secret hygiene.** Rotate placeholder `JWT_SECRET`, exposed Aiven password, admin password post-ENC; `.env` gitignored; prod secrets in dashboard/KMS only (now incl. `ENC_KEY`, `LLM_*_API_KEY`).

### F — Mobile shell hardening (new — branch `feature/mobile-capacitor-plan` → `main`)

- [ ] **MOB-01 Backup rules.** `allowBackup=false` (or scoped `backup_rules.xml` excluding WebView storage); verify `adb backup` yields no tokens; `allowCleartextTraffic=false`.
- [ ] **MOB-02 Secure storage migration.** Replace `authStorage.js` WebView storage with secure-storage plugin for tokens on native; keep Preferences for theme/lang; test login persists after app kill + reboot (plan §5 checklist).
- [ ] **MOB-03 Mic permission UX.** `RECORD_AUDIO` rationale dialog (EN/SI/TA) before system prompt; graceful denial (text input still works); no background recording; Data Safety matches.
- [ ] **MOB-04 Release build config.** Prod `REACT_APP_API_URL` → Render URL, `NODE_ENV=production`, exact `CORS_ALLOWED_ORIGINS` (Vercel + `capacitor://localhost` only — no LAN IPs); versionCode/versionName bump; signed `aab`.
- [ ] **MOB-05 Router/WebView check.** Confirm `BrowserRouter` vs `HashRouter` decision from plan §2 (no blank screens on deep link); `homepage ./` retained.
- [ ] **MOB-06 Merge + version.** Merge mobile branch to `main`, tag (e.g. v0.8.0-mobile), update `architecture.md` + release notes.

### G — Encryption migration verification & legacy removal (no data loss)

> Rule: never `DELETE`/`DROP` user data to "start fresh encrypted". Every step below keeps the app working with rollback intact. Temporary migration columns are named `temp_*` (or suffixed `_legacy`) and **must be removed** in the release after verification — each carries its removal item below. *Play maps to: Data Safety "deletion" means user-initiated erasure — admin wipes/dumps look like data loss to review.*

- [x] **MIG-01 Additive schema — DONE 2026-10-10.** `temp_*` + `enc_v` live on Aiven (132 rows intact); `initTable` converges fresh/existing DBs; backup + counts recorded pre-change.
- [x] **MIG-02 Dual-write + dual-read — DONE 2026-10-10 (PR #42).** Model + list/recent/PUT paths; also fixed pre-existing PUT/DELETE OkPacket crash found during verification.
- [x] **MIG-03 Backfill — DONE 2026-10-10.** `scripts/backfill-expense-encryption.js` (re-runnable, batched): 132/132, 0 failed, 0 remaining.
- [x] **MIG-04 Test-account verification — DONE 2026-10-10.** `enctest` end-to-end (EN/SI/TA/emoji, POST/GET/PUT/DELETE exact, no crypto leakage, tamper rejected); account removed after, prod back to 9 users / 132 expenses, all `enc_v=1`.
- [ ] **MIG-05 Legacy removal (one release later, only on evidence).** Requires: `enc_v=0` = 0 table-wide, test-account + real-account sample verified via API, one full release with zero fallback hits, fresh backup taken immediately before. Then `ALTER TABLE expenses DROP COLUMN description` (and rename `temp_description_enc → description_enc`, `temp_description_iv → description_iv`). Re-run MIG-04 checks post-drop; monitor decrypt errors 48h. Rollback = restore pre-`ALTER` backup.
- [ ] **MIG-06 Temp-column hygiene.** No `temp_*`/`*_legacy` column survives past its MIG-05. Pre-submission grep of schema for `temp_` must be empty; Data Safety + privacy policy describe only final columns.

---

## 5. Acceptance criteria

1. SQL dump without `ENC_KEY` reveals **no** readable description, email, IP, or transcript.
2. Log grep for `amount|description|transcript|prompt|@|Bearer|BEGIN|API_KEY` empty on prod logs.
3. `curl http://` → redirect/HSTS; DB connects with `rejectUnauthorized:true`; WebView blocks cleartext.
4. 11th login in 15 min → 429; voice over-limit → 429 with `VOICE_*` code.
5. `adb backup` of release build contains no JWT/expense data.
6. Mic denied → app still works via typing; mic granted → no background recording indicator abuse.
7. User self-delete from app cascades; Data Safety + privacy + deletion URL live.
8. Data Safety "sharing" lists the chosen LLM provider truthfully.
9. Migration: `enc_v=0` = 0, test-account decrypt verified (MIG-04), no `temp_*` columns remain (MIG-05/06).

---

## 6. Phased rollout (suggested)

| Phase | Ships | Notes |
|-------|-------|-------|
| P0 (this week) | LOG-01, MOB-01, PLAY-01 ✅shipped, D-6 provider pick | Zero-migration wins; locks mobile privacy story |
| P1 | ENC-01–05+07 ✅ENC-01/02 done, MIG-01–04 ✅done, AUTH-04/05/06, STORE-01/MOB-02 | Description + email encryption shipped (PR #42 + dev); remaining: IP/reason, rate limits, secure storage |
| P2 | AUTH-01/02/03, TLS-01/02, APP-01, MOB-03–06, PLAY-02–05 | Merge mobile branch, signed `aab`, store submission |

---

## 7. Open questions for owner

1. Email-login keep (HMAC index) or username-only to simplify ENC-02? — *open*
2. ~~Prod LLM provider pick~~ DECIDED: Cohere (2026-10-11), reconfirmed 2026-10-20. Free tier confirmed 2026-10-13: 30-day retention, training opt-out absent, no DPA. Upgrade to paid/ZDR later for stronger posture? (D-6)
3. ~~Retention OK~~ **RESOLVED 2026-10-20: 90/30/30 confirmed** (reset rows >90d, logs >30d, voice artifacts >30d — OPS-01/ENC-03 numbers).
4. ~~Prod `ENC_KEY` + `LLM_*_API_KEY` holder~~ **RESOLVED 2026-10-20: Render env** (no external KMS; rotation = dashboard var swap per ENC-05).
5. Merge `feature/mobile-capacitor-plan` to `main` now, or after P1 encryption lands? — *open*
