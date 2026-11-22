# Runbook: Email Removal Phase 2

| Field | Value |
|-------|--------|
| **Status** | Production cutover complete 2026-11-22; Render `EMAIL_HMAC_PEPPER` removal pending owner |
| **Related** | `MIG-07` in [../srs/playstore-data-safety.md](../srs/playstore-data-safety.md) |
| **Goal** | Make login username-only, remove legacy email storage, and retire `EMAIL_HMAC_PEPPER` |

> Status: the grace period ended **2026-11-15**; production login is
> username-only and the legacy email columns were dropped on **2026-11-22**.
> The remaining action is deleting `EMAIL_HMAC_PEPPER` from Render. Keep the
> pre-cutover backup and passphrase until the rollback window closes.

## Legacy users to confirm

| Username | Note |
|----------|------|
| `Shaminda` | — |
| `Sachinthani` | Stored with a trailing space; sign in as `Sachinthani` |
| `kavinda99` | — |
| `Shaki` | — |

## Preconditions

- [x] Phase 1 is deployed (`/api/auth/register` rejects `email`).
- [x] The four users have been emailed their usernames and removal date.
- [x] The grace period elapsed on 2026-11-15.
- [x] `EMAIL_HMAC_PEPPER` was present before the cutover (needed only for rollback now).
- [x] A fresh production backup exists and restore was tested (2026-11-22).

## Cutover order

1. [x] Phase 2 code (ready to deploy):
   - Remove `email` from the login schema.
   - Make `User.findByLogin()` username-only.
   - Remove `User.findByEmail()` and `User.resolveEmail()`.
   - Remove email from login/profile/admin responses and UI.
2. [x] Verify username lookup for all four legacy users (production collation matching confirmed; owner login smoke test still advised).
3. [x] Verify new registration and login use username only (local end-to-end + production patch probe).
4. [x] Take a fresh backup (2026-11-22; encrypted dump restored and checksums matched).
5. [x] Run the schema migration (backup first):
   ```bash
   MIG07_CONFIRM=DROP_EMAIL_COLUMNS node scripts/drop-legacy-email-columns.js
   ```
   - Drop `users.email`.
   - Drop `users.temp_email_enc`.
   - Drop `users.temp_email_iv`.
   - Drop `users.email_hmac`.
6. [x] Verify the schema:
   ```bash
   node scripts/verify-email-removal.js
   ```
7. [ ] **PENDING OWNER:** Remove `EMAIL_HMAC_PEPPER` from the production environment.
8. [x] Keep `ENC_KEY`; expense descriptions still depend on it.
9. [x] Verify:
   - Username signup and login.
   - Username password reset/admin approval.
   - Profile and admin pages render without email.
   - No email decrypt/lookup errors in logs (API probes passed; owner should also check Render logs).
10. [x] Update:
   - `MIG-07` to complete.
   - `docs/api.md`, `docs/database.md`, `docs/privacy-policy.md`.
   - Play **Data Safety** (email no longer collected).
   - `docs/security.md`.

## Rollback

- Restore the pre-migration backup if the code deployment fails before column drops.
- If columns are dropped and a rollback is required, restore the backup; do not
  recreate plaintext email columns manually.
- Keep the old `EMAIL_HMAC_PEPPER` backed up until the migration is confirmed
  stable in case a rollback restore needs it.
