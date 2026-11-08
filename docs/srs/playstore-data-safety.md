# SRS: Play Store Data Safety — Encryption & App Hardening

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Play Store readiness with safety-first data protection |
| **Status** | **Living release checklist — audited 2026-11-03 against `main` @ `d5b9e42`. Not submission-ready; see §6.** |
| **Depends on** | [admin-panel.md](./admin-panel.md), [password-reset-admin-approval.md](./password-reset-admin-approval.md), [voice-expense-input.md](./voice-expense-input.md) |
| **Related docs** | [database.md](../database.md), [api.md](../api.md), [deployment/architecture.md](../deployment/architecture.md), [deployment/capacitor-android-plan.md](../deployment/capacitor-android-plan.md) |
| **Goal** | Protect financial + identity + voice data even if the DB leaks, logs leak, the device is lost, or the API is probed — then satisfy Play Data Safety / account-deletion rules as a consequence |

> Scope note: this SRS tracks the code actually on `main`, not the old
> `feature/mobile-capacitor-plan` branch state. Tick `[x]` only when the code
> is shipped and locally verified. **PENDING** means code exists but a
> production, device, Play Console, or operations check is still required.

---

## 1. Current state audit (2026-11-03, `main` @ `d5b9e42`)

### 1.1 Implemented and verified in code

| Area | Current protection | Source |
|------|--------------------|--------|
| Passwords | `bcrypt` cost 10; never returned by the API | `backend/models/User.js`, `backend/routes/auth.js` |
| Reset codes | 6-digit CSPRNG, bcrypt-hashed, single-use, 30-minute expiry, admin-approved request | `backend/models/PasswordResetRequest.js` |
| Expense isolation | Every expense query filters by `user_id` from the JWT; edit/delete verify ownership | `backend/routes/expenses.js` |
| Voice endpoint | Auth required, zod schema, dedicated rate limit, mock provider forbidden in production | `backend/routes/voiceExpenses.js`, `backend/services/voice/` |
| Capacitor shell | Merged to `main` via PR #35 (`4d164fa`); `appId com.shaminda.expensetracker`, `webDir build`, `homepage ./` | `frontend/capacitor.config.ts`, `frontend/android/` |
| User sessions | 15-minute access JWT + rotating opaque refresh token (SHA-256 in DB), httpOnly/Secure/SameSite=None cookie, reuse detection revokes all sessions, logout/password change/reset revoke | `backend/config/jwt.js`, `backend/models/RefreshToken.js`, `backend/routes/auth.js` |
| Admin sessions | Separate admin JWT secret, 15-minute expiry, no refresh, role check, dedicated login, not linked from user UI | `backend/middleware/adminAuth.js`, `backend/routes/admin.js` |
| Password policy | 10-character minimum, HIBP k-anonymity breach check, `current != new`; frontend forms aligned | `backend/middleware/validateBody.js`, `backend/utils/breachCheck.js` |
| Rate limits | Login 10/15 min (IP+account), admin 5/15 min, register 5/hour, forgot 5/hour, reset 10/hour, voice 10/min; generic 429 + `Retry-After` | `backend/middleware/rateLimit.js`, `backend/middleware/voiceRateLimit.js` |
| Request validation | Strict zod schemas on every auth/admin/expense/voice JSON body; unknown keys rejected; uniform `400 REQUEST_INVALID` | `backend/middleware/validateBody.js`, `backend/routes/` |
| CORS | Development is permissive; production uses exact `CORS_ALLOWED_ORIGINS` with credentials | `backend/server.js` |
| Security headers | Helmet defaults + HSTS (1 year, `includeSubDomains`, `preload`); `trust proxy` for Render | `backend/server.js` |
| DB transport | MySQL SSL with Aiven CA verification (`rejectUnauthorized:true`); production fails fast if `DB_CA_CERT` is missing | `backend/config/db.js` |
| Field encryption | AES-256-GCM for expense description, user email, and encrypted reset-rejection notes; per-row IV + auth tag; key only from env | `backend/utils/fieldCrypto.js`, `backend/models/Expense.js`, `backend/models/User.js`, `backend/models/PasswordResetRequest.js` |
| Email lookup | HMAC-SHA256 blind index (`email_hmac` + `EMAIL_HMAC_PEPPER`) for uniqueness/login | `backend/utils/fieldCrypto.js`, `backend/models/User.js` |
| IP minimization | Reset-request IPs truncated to `/24` IPv4 or `/48` IPv6 on insert; never returned to the admin UI | `backend/models/PasswordResetRequest.js` |
| Account deletion | Password-confirmed `DELETE /api/auth/me`; FK cascade verified; danger-zone UI in EN/SI/TA | `backend/routes/auth.js`, `frontend/src/components/Account.jsx` |
| Android hardening | `allowBackup=false`, `fullBackupOnly=false`, `usesCleartextTraffic=false`; FileProvider not exported; only `INTERNET` + `RECORD_AUDIO` | `frontend/android/app/src/main/AndroidManifest.xml` |
| Release signing | Reads `keystore.properties`; `*.jks` and keystore properties are gitignored | `frontend/android/app/build.gradle`, `frontend/android/.gitignore` |
| Logging | Sensitive token/SQL/amount/description logs dev-gated or removed; production 5xx responses generic | `backend/middleware/auth.js`, `backend/models/Expense.js`, `backend/server.js` |
| Retention | Nightly purge deletes reset rows and expired refresh tokens older than 90 days; voice artifacts are never persisted | `backend/scripts/purge-retention.js`, `backend/server.js` |
| Debug surface | `/api/expenses/test-db` is now disabled in production (fixed 2026-11-03) | `backend/routes/expenses.js` |

### 1.2 Remaining risk register

| # | Item | Current state | Required action |
|---|------|---------------|-----------------|
| S-1 | `expenses.description` | Encrypted `temp_*` columns exist and are backfilled, but **new writes still dual-write legacy plaintext `description`**. A raw DB dump still exposes it. | `MIG-05` |
| S-2 | `expenses.amount` | Plaintext by decision (`SUM()` aggregation). | Keep documented; compensate with TLS, no-logging, admin isolation (`ENC-06`). |
| S-3 | `users.email` | Encrypted `temp_*` columns + HMAC exist, but **new writes still dual-write legacy plaintext `email`**. There is no email legacy-removal item yet. | `MIG-07` |
| S-4 | `password_reset_requests.request_ip` | New rows are minimized; existing production rows still need the backfill. | Run `ENC-03` backfill. |
| S-5 | `password_reset_requests.reject_reason` | New writes use enum code + encrypted note; legacy plaintext rows still need migration. | Run `ENC-04` migration. |
| S-6 | JWT storage in WebView | Access token still mirrored in `localStorage`/`sessionStorage`; secure native storage not implemented. | `STORE-01`, `MOB-02` |
| S-7 | Server logs | Sensitive-log fixes are shipped. | Keep log-grep acceptance check in CI/release. |
| S-8 | Transport | Helmet/HSTS, verified DB TLS, and Android cleartext blocking are shipped. | Re-verify headers on the deployed API and inside the Capacitor WebView. |
| S-9 | Delete path | In-app self-delete shipped. | Host the external account-deletion URL required by Play (`PLAY-06`). |
| S-10 | Voice transcripts | Prompt minimized; no server persistence; Cohere retention/training disclosed. | DPA/ZDR not available on the free tier; keep disclosure accurate (`D-6`). |
| S-11 | Android backup | `allowBackup=false` and `usesCleartextTraffic=false` shipped. | Verify with `adb backup` on a release build. |
| S-12 | CORS | Production allowlist code shipped. | Set exact Render + Vercel + Capacitor origins at release (`MOB-04`). |
| S-13 | Encryption key rotation | `ENC_KEY` is env-only and length-validated, but `ENC_KEY_ID` is unused and key-version rotation is not implemented. | `ENC-05` |
| S-14 | Dependencies | `npm audit --omit=dev` reports backend 7 (1 critical, 5 high) and frontend 72 (3 critical), including runtime `axios`/`react-router` advisories. | `DEP-01` |
| S-15 | Play Console assets | Privacy policy, Data Safety, deletion URL, content rating, target audience, ads, and reviewer access are not complete. | `PLAY-02`, `PLAY-03`, `PLAY-05`, `PLAY-06`, `PLAY-07` |

### 1.3 Packaging reality

Capacitor is now merged to `main` (PR #35 / `4d164fa`). The Android shell uses
`targetSdk 36`, `minSdk 24`, `versionCode 2`, `versionName 0.7.0`, and a release
signing config that reads a gitignored `keystore.properties`. A signed AAB,
Play App Signing registration, and 64-bit verification are still pending.
The app still uses `BrowserRouter` with `homepage ./`; deep-link behavior inside
the Capacitor WebView must be verified (`MOB-05`).

---

## 2. Threat model (what we defend against)

| Attacker | Capability | SRS must hold |
|----------|-----------|---------------|
| DB dump reader (SQL leak, stolen backup, ex-admin) | Reads all tables | S-1/S-3/S-4 unreadable without app key |
| Log scraper (Render/Railway logs, `console.log`) | Reads logs | No amounts, descriptions, emails, tokens, transcripts, SQL in logs |
| Network observer (open WiFi, proxy) | Sniffs HTTP | TLS-only, HSTS, no HTTP fallback, no cleartext WebView traffic |
| XSS / malicious browser ext / rogue WebView JS | Runs JS in origin | Short-lived access token, no long secrets in plain WebView storage |
| Lost/stolen phone / `adb backup` | Reads app files + backups | Tokens in encrypted storage, `allowBackup=false` + rules, optional app-lock |
| Abusive client | Brute-forces login/reset/voice | Rate limits on all public routes (no persistent account lockout), no enumeration |
| Curious admin | Browses DB | Sees minimum; sensitive columns encrypted, reason codes not free text |
| LLM subprocessor | Receives transcripts | Minimal prompt (no username/email), no logging retention, DPA in place |

Out of scope: rooted-device OS compromise, Aiven disk theft (covered by Aiven
AES-256 plus our column encryption as a second layer).

---

## 3. Key decisions

| # | Decision | Options | Status |
|---|----------|---------|--------|
| D-1 | `amount` encryption? | A) Keep plaintext + TLS + Aiven disk encryption; B) Deterministic AES-SIV | **A for v1** — documented explicitly; encrypt description/email/IP instead |
| D-2 | Encryption primitive | AES-256-GCM per-row vs libsodium sealed box | **AES-256-GCM, `ENC_KEY` 32B, `*_enc` + `*_iv`, `enc_v INT`** |
| D-3 | Search on encrypted columns? | HMAC index vs no search | **No search on `description` v1**; HMAC index on `email` only |
| D-4 | Native wrapper | Capacitor vs TWA | **RESOLVED: Capacitor shell merged to `main`** |
| D-5 | User self-delete | `DELETE /api/auth/me` vs admin-only | **SHIPPED: self-delete added; admin delete retained** |
| D-6 | Voice LLM provider + data sharing | Gemini / Cohere / OpenAI-compatible / DeepSeek / mock | **Cohere in production.** Prompts retained 30 days by default; free tier has no training opt-out and no DPA. Keep disclosure + typing fallback; upgrade to paid/ZDR later. |
| D-7 | Legacy plaintext cleanup | Drop before first Play release vs ship with documented legacy columns | **Open — drop before submission recommended** |
| D-8 | Encryption key rotation | Single `ENC_KEY` v1 vs versioned `ENC_KEY_ID` before Play | **Open** |

---

## 4. Requirements checklist

Legend: `[x]` = code shipped and locally verified; `[ ]` = incomplete or
production/device/console verification still pending. **PENDING** calls out the
remaining step on shipped code.

### A — Column-level encryption

- [x] **ENC-01 `expenses.description` encrypted at rest.** AES-256-GCM `temp_description_enc`/`temp_description_iv` + `enc_v`; dual-write/dual-read; ciphertext stripped from API responses; 132/132 backfilled. Legacy `description` is still dual-written and retained until `MIG-05`.
- [x] **ENC-02 `users.email` encrypted at rest.** AES-256-GCM `temp_email_enc`/`temp_email_iv` + `email_hmac` blind index; dual-write/read; 4/4 backfilled; email login works. Legacy `email` is still dual-written and retained until `MIG-07`.
- [x] **ENC-03 `request_ip` minimized.** `/24` IPv4 + `/48` IPv6 truncation on insert; unrecognized values stored as NULL; never returned to admin. **PENDING:** run `node scripts/backfill-request-ip-minimization.js` once against production.
- [x] **ENC-04 `reject_reason` structured.** Enum `reject_reason_code` + optional AES-256-GCM-encrypted note; admin reject route validates `{code, note}`; supersede writes code only. **PENDING:** run `node scripts/migrate-reject-reason.js` once against production.
- [ ] **ENC-05 Key management — PARTIAL.** `ENC_KEY` is env-only and validated as 32 bytes. `ENC_KEY_ID` is documented but unused; there is no key-version rotation or background re-encrypt. Dev key must differ from prod.
- [x] **ENC-06 `amount` explicitly not encrypted in v1.** Rationale and compensations recorded: no amounts in URLs, logs, client errors, or admin API; Aiven disk encryption is the provider layer.
- [x] **ENC-07 Voice transcripts minimized + not persisted.** Prompt sends only transcript + locale + timezone + local date; no DB insert; no provider/transcript logging. Cohere retention/training is disclosed in the privacy paragraph and Play Data Safety.

### B — Transport, API hardening, and abuse control

- [x] **TLS-01 HTTPS everywhere (server legs).** `trust proxy` + HSTS via helmet; DB TLS verified with `DB_CA_CERT`; Android cleartext disabled. **PENDING:** run `curl -sI https://<render-url>/` against the deployed API and confirm the HSTS header.
- [x] **TLS-02 Security headers.** Helmet defaults + explicit HSTS; verified locally. **PENDING:** re-verify response headers inside the Capacitor WebView.
- [x] **AUTH-01 Separate secrets.** `JWT_USER_SECRET` and `JWT_ADMIN_SECRET`; middleware split; legacy `JWT_SECRET` fallback. **PENDING:** set both secrets in Render, then remove the legacy fallback.
- [x] **AUTH-02 Token lifetime + rotation.** 15-minute user/admin access tokens; opaque rotating refresh tokens (SHA-256 in DB), httpOnly/Secure/SameSite=None cookie, reuse detection revokes all sessions; logout/password change/reset revoke.
- [x] **AUTH-03 Password policy.** 10-character minimum, HIBP k-anonymity breach check, `current != new` on change and reset; frontend forms aligned. **Regression test missing:** the HIBP hostname typo (`pwnedpasswordes` -> `pwnedpasswords`) was fixed on 2026-11-03; add a test that locks the URL.
- [x] **AUTH-04 Rate limits.** Login 10/15 min (IP+account), admin 5/15 min, register 5/hour, forgot 5/hour, reset 10/hour, voice 10/min; generic 429 + `Retry-After`. **No persistent account lockout is implemented** (rate limiting only); the store does not require lockout.
- [x] **AUTH-05 Validation.** Zod schemas on every JSON body; username/amount/description/category bounds; `.strict()` rejects unknown keys; uniform `400 REQUEST_INVALID`.
- [x] **AUTH-06 LLM secrets.** Provider keys read only from server env; no key material in repo/frontend/build; mock fails closed in production; timeout/retry capped.
- [x] **API-01 CORS allowlist.** Production uses exact origins from `CORS_ALLOWED_ORIGINS` with credentials; development remains permissive. **PENDING:** set the release allowlist (`MOB-04`).
- [x] **API-02 Voice rate limit.** Dedicated 10/minute limiter on `/api/voice-expenses/draft`.
- [x] **API-03 Production debug endpoints disabled.** `/api/expenses/test-db` returns 404 when `NODE_ENV=production`; it no longer exposes table names or DB diagnostics.

### C — Logs, storage, client

- [x] **LOG-01 No sensitive logs.** Bearer/header, decoded-token, SQL-param, amount, and description logs are dev-gated or removed; production 5xx responses are generic; voice service/providers have no request logging. **PENDING:** run the release log-grep check.
- [ ] **STORE-01 Token storage.** Secure-storage plugin not implemented. `@capacitor/preferences` is unencrypted and must not hold JWTs. Web access token is still in `localStorage`/`sessionStorage`.
- [ ] **STORE-02 Logout hygiene — PARTIAL.** Web logout clears storage and revokes the refresh session; admin session uses `sessionStorage` (tab-close ends it). Mobile secure-storage clearing is pending with `STORE-01/MOB-02`.
- [ ] **APP-01 App lock (Should, not a Play blocker).** No PIN/biometric gate or 3-strike local wipe.

### D — Play Store account, data, and release gates

- [x] **PLAY-01 In-app account deletion.** `DELETE /api/auth/me` with password confirmation; FK cascade verified; trilingual danger-zone modal; post-delete login notice. Admin delete retained.
- [ ] **PLAY-02 Data Safety form truth.** Must declare financial info (amount/description), personal info (username/email/transcript), microphone (foreground only), app activity, and device IDs; sharing with Cohere + Aiven/Render; encryption in transit; deletion available.
- [ ] **PLAY-03 Privacy policy.** Draft is in `docs/privacy-policy.md`; still needs a public URL, in-app link, and final contact/date fields. The approved voice disclosure paragraph is already shown as the in-app mic hint.
- [ ] **PLAY-04 Binary readiness — PARTIAL.** Mobile shell is merged; `targetSdk 36`, release signing config, permissions limited to `INTERNET` + `RECORD_AUDIO`. **PENDING:** signed AAB, Play App Signing registration, 64-bit verification, versionCode/versionName bump if needed, and no `REQUEST_INSTALL_PACKAGES`.
- [ ] **PLAY-05 Pre-launch.** Internal track -> clean pre-launch report (no cleartext, no weak crypto, mic disclosure OK); content rating done; SI/TA screenshots.
- [ ] **PLAY-06 Hosted account-deletion URL.** Play requires a web deletion-request URL in addition to in-app deletion. **Not currently recorded as its own item before this audit.**
- [ ] **PLAY-07 Play Console metadata.** Target audience, ads declaration, app access instructions, reviewer test account, and privacy-policy link. **Not explicitly recorded before this audit.**

### E — Retention and operations

- [x] **OPS-01 Retention job.** Nightly purge removes reset rows and expired refresh tokens older than 90 days; reset codes expire in 30 minutes; voice artifacts are never persisted. **PENDING:** confirm the Render log-retention setting.
- [ ] **OPS-02 Backup encryption + Aiven disk-encryption confirmation.** Aiven backups encrypted; manual dumps GPG-encrypted; restore tested; owner confirms Aiven disk encryption at rest.
- [ ] **OPS-03 Secret hygiene.** Rotate the placeholder `JWT_SECRET`, exposed Aiven password, and admin password post-encryption; keep `.env` gitignored; production secrets only in Render env/KMS.
- [ ] **DEP-01 Dependency vulnerability gate.** Backend `npm audit --omit=dev`: 7 production advisories (1 critical, 5 high). Frontend: 72 advisories (3 critical), including runtime `axios` and `react-router` issues. Triage and upgrade before release.
- [ ] **DOC-01 Release documentation sync.** `docs/security.md` still describes pre-2026-10-20 state (no helmet, 6-character passwords, shared JWT, `allowBackup=true`). Sync it with `main` before using it as release evidence.

### F — Mobile shell hardening

- [ ] **MOB-01 Backup rules — CODE SHIPPED.** `allowBackup=false`, `fullBackupOnly=false`, `usesCleartextTraffic=false` are in the manifest. **PENDING:** verify `adb backup` of a release build contains no JWT/expense data.
- [ ] **MOB-02 Secure storage migration.** Replace `authStorage.js` WebView storage with EncryptedSharedPreferences/Keychain for tokens on native; Preferences only for theme/language; verify login survives app kill/reboot.
- [ ] **MOB-03 Mic permission UX — PARTIAL.** Trilingual privacy hint and permission-denied handling exist. **PENDING:** dedicated rationale dialog before the system prompt, no background recording verification, and Data Safety alignment.
- [ ] **MOB-04 Release build config — PARTIAL.** Signing config, `targetSdk 36`, and version metadata exist. **PENDING:** production `REACT_APP_API_URL`, `NODE_ENV=production`, exact CORS origins (Vercel + `capacitor://localhost` + `https://localhost`, no LAN IPs), signed AAB.
- [ ] **MOB-05 Router/WebView check — PARTIAL.** `BrowserRouter` and `homepage ./` are retained. **PENDING:** verify deep links and refreshes do not produce blank screens in the Capacitor WebView.
- [ ] **MOB-06 Merge + version — PARTIAL.** Mobile branch is merged to `main` via PR #35. **PENDING:** mobile release tag (e.g. `v0.8.0-mobile`), architecture/release-notes update.
- [x] **MOB-07 Android surface hygiene.** `MainActivity` is exported only for the launcher; FileProvider is `exported=false`; permissions are only `INTERNET` + `RECORD_AUDIO`; no `REQUEST_INSTALL_PACKAGES`.

### G — Encryption migration verification and legacy removal

> Rule: never delete/drop user data to "start fresh encrypted". Every step
> keeps the app working with rollback intact.

- [x] **MIG-01 Additive schema.** Temporary encrypted columns and `enc_v` live on Aiven; `initTable` converges fresh/existing DBs; backup + counts recorded.
- [x] **MIG-02 Dual-write + dual-read.** Expense model and list/recent/PUT paths; also fixed the pre-existing PUT/DELETE `OkPacket` crash.
- [x] **MIG-03 Backfill.** Expense backfill: 132/132, 0 failed, 0 remaining `enc_v=0`.
- [x] **MIG-04 Test-account verification.** End-to-end EN/SI/TA/emoji create/read/update/delete, no crypto leakage, tamper rejected; test account removed.
- [ ] **MIG-05 Description legacy removal.** Requires: `enc_v=0` = 0 table-wide, API samples verified, one release with zero fallback hits, fresh backup. Then remove legacy description writes/reads, drop `description`, rename `temp_description_enc → description_enc` and `temp_description_iv → description_iv`, and monitor decrypt errors.
- [ ] **MIG-06 Temp-column hygiene.** No `temp_*`/`*_legacy` column survives past its migration; pre-submission schema grep for `temp_` must be empty.
- [ ] **MIG-07 Email legacy removal.** Requires the same evidence as MIG-05. Then remove legacy plaintext email writes/reads, drop `email`, rename `temp_email_enc → email_enc` and `temp_email_iv → email_iv`; keep `email_hmac` for lookup/uniqueness. **This item was missing before the 2026-11-03 audit.**

---

## 5. Acceptance criteria

1. **After MIG-05/MIG-07:** a SQL dump without `ENC_KEY` reveals no readable description or email. (Not true while legacy plaintext columns remain.)
2. Release log grep for `amount|description|transcript|prompt|@|Bearer|BEGIN|API_KEY` is empty.
3. `curl http://` redirects or returns HSTS; DB connects with `rejectUnauthorized:true`; WebView blocks cleartext.
4. 11th login in 15 minutes returns 429; voice over-limit returns 429 with the expected code.
5. `adb backup` of a release build contains no JWT/expense data.
6. Mic denied -> typing still works; mic granted -> no background-recording indicator abuse.
7. User self-delete cascades correctly; Data Safety + privacy policy + hosted deletion URL are live.
8. Data Safety "sharing" lists Cohere and infrastructure providers truthfully.
9. Migration: `enc_v=0` = 0, test-account decrypt verified, no `temp_*` columns remain.
10. Production dependency audit is triaged; no unmitigated critical/high runtime advisories ship.
11. `/api/expenses/test-db` returns 404 when `NODE_ENV=production`.

---

## 6. Remaining release gates

| Gate | Required items | Blocking? |
|------|----------------|-----------|
| G1 — Data at rest | `MIG-05`, `MIG-07`, `ENC-03` + `ENC-04` production runs, `ENC-05` decision, `OPS-02` | Production: yes |
| G2 — Mobile client | `STORE-01`, `STORE-02`, `MOB-02`, `MOB-03`, `MOB-04`, `MOB-05`, `MOB-06` | Production: yes (APP-01 optional) |
| G3 — Release binary | Signed AAB, Play App Signing, 64-bit check, version bump, production API/CORS | Production: yes |
| G4 — Play Console | `PLAY-02`, `PLAY-03`, `PLAY-05`, `PLAY-06`, `PLAY-07` | Production: yes |
| G5 — Ops/deps/docs | `OPS-01` platform confirm, `OPS-02`, `OPS-03`, `DEP-01`, `DOC-01` | Production: yes |
| G6 — Pre-launch | Internal track + clean pre-launch report | Final gate |
| Backlog | `APP-01` app lock, Cohere paid/ZDR upgrade | Not required for first release |

---

## 7. Open questions for owner

1. ~~Email-login keep or username-only?~~ **Resolved:** email login kept via the HMAC blind index; legacy plaintext email must be removed (`MIG-07`).
2. **Cohere free tier:** 30-day retention and no training opt-out. Keep disclosure + typing fallback for v1, or upgrade to a paid/ZDR plan before release?
3. ~~Retention OK?~~ **Resolved 2026-10-20:** 90/30/30 (reset rows, logs, voice artifacts).
4. ~~Prod `ENC_KEY` + `LLM_*_API_KEY` holder?~~ **Resolved 2026-10-20:** Render env; rotation via dashboard.
5. ~~Merge `feature/mobile-capacitor-plan`?~~ **Resolved:** merged to `main` via PR #35.
6. **ENC-05:** is single-key v1 acceptable for the first Play release, or must `ENC_KEY_ID`/rotation be implemented first?
7. **Legacy cleanup:** drop legacy plaintext columns before first Play submission (recommended) or ship with documented risk?
8. **Dependency remediation:** how far to upgrade `axios`/`react-router`/`react-scripts` before release versus documenting accepted risk?

---

*Changelog: v1 created 2026-10-10. v2 added encryption/MIG items. v3 2026-11-03: audited `main` @ `d5b9e42`; corrected stale branch/transport/token/log statuses; marked MOB-01, MOB-06, MOB-07, PLAY-04, STORE-02, and MOB-03 as partial/code-shipped where appropriate; added API-01/02/03, MIG-07, DEP-01, PLAY-06, PLAY-07, DOC-01; recorded the HIBP hostname typo fix and production `/test-db` 404 gate; replaced the stale P0/P1/P2 table with current release gates.*
