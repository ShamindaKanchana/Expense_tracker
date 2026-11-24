# Runbook: Description Removal Phase 2 (MIG-05)

| Field | Value |
|-------|--------|
| **Status** | **COMPLETE 2026-11-23** — DDL applied, Phase B deployed, verified |
| **Related** | `MIG-05`, `MIG-06` in [../srs/playstore-data-safety.md](../srs/playstore-data-safety.md) |
| **Goal** | Remove the legacy plaintext `expenses.description` column and make the encrypted columns permanent |

> This is the destructive phase. Legacy plaintext descriptions are dropped.
> Take a fresh verified backup and stop writes before running the migration.

## Why this is safe now

Phase A has been live since 2026-11-14. Production was checked on 2026-11-22:

- 193 expenses total
- `enc_v = 0`: 0
- Missing ciphertext/IV: 0
- Legacy plaintext rows: 176
- Newest writes (2026-11-14 through 2026-11-21) have an empty `description` tombstone

Every row has an encrypted copy. The 176 legacy plaintext values are redundant
and will be removed by the drop.

## Preconditions

- [x] Maintenance window agreed; users will not use the app during the cutover.
- [x] Render shell unavailable on the free plan, so the migration was run locally
      against production using `backend/.env` and the production `ENC_KEY`.
- [x] Full decrypt check passes against production:
      ```bash
      cd backend
      npm run verify:encryption -- --all
      ```
      Expected: `enc_v0=0`, `missing_encrypted=0`, `Decrypt full check: 193 rows, 0 failed`.
- [x] Fresh encrypted backup created and restore-tested:
      `docs/deployment/backup-restore.md`.
- [x] Backup and passphrase copied off-host (owner confirmed 2026-11-23).
- [x] Phase B code is built and ready to deploy immediately after the DDL.

## Code changes

- `Expense.resolveDescription()` reads only `description_enc` / `description_iv`.
  There is no plaintext fallback; missing or corrupt ciphertext logs an error
  and returns an empty description.
- Expense list, recent, create, update, and model writes use the permanent
  encrypted column names.
- `initTable` creates the new schema and refuses to boot against an unmigrated
  database.
- `scripts/apply-mig05-phase-b.js` performs the guarded drop/rename.
- `scripts/verify-encryption-migration.js --phase=b` verifies the final schema.
- `scripts/test-data.js` writes the new schema.

## Cutover order

1. [x] Announce the maintenance window and stop writes. The free Render plan has
       no shell/API suspend, so the migration was run locally with no active
       users; the API returned errors only during the DDL/deploy window.
2. [x] Take the fresh GPG backup and record row counts. Do not proceed without
       a successful restore test.
3. [x] Run the preflight dry run against production with the production
       `ENC_KEY`:
       ```bash
       cd backend
       npm run mig05:dry-run
       ```
       Expected: 193 rows, `enc_v0=0`, `missing_encrypted=0`, every row decrypts.
4. [x] Apply the schema migration:
       ```bash
       MIG05_CONFIRM=APPLY_PHASE_B npm run mig05:apply
       ```
       This single `ALTER TABLE` drops `description` and renames
       `temp_description_enc` → `description_enc` and
       `temp_description_iv` → `description_iv`.
5. [x] Deploy the Phase B backend immediately (PR #62; `main` `83a4a3f`).
6. [x] Verify the deployed schema and decrypt path:
       ```bash
       npm run verify:encryption -- --phase=b --all
       ```
       Expected: no `description` or `temp_description_*` columns, `enc_v=0` is
       0, missing encrypted data is 0, and the decrypt check passes.
7. [x] Smoke-test:
       - Sign in.
       - Create an expense and confirm the description renders.
       - Edit and delete that expense.
       - Reload the dashboard and expense list.
       - Check Render logs for `Expense has no encrypted description` and
         `Expense decrypt failed`.
8. [x] Update `MIG-05` / `MIG-06` in the SRS, `docs/security.md`,
       `docs/database.md`, and the backup/restore queries.

## Expected downtime

- Schema DDL: a few seconds for 193 rows.
- Render redeploy: roughly 2–5 minutes.
- Verification and smoke test: 1–2 minutes.
- Plan for **5–10 minutes** of API downtime.

## Rollback

- If the migration fails before the `ALTER TABLE` commits, the old schema is
  unchanged; resume the old service.
- If the DDL succeeds but the new deploy fails, restore the pre-cutover backup
  and redeploy the previous commit. Do not recreate plaintext description
  values manually.
- Keep the pre-cutover backup and passphrase until the rollback window closes.

## Pre-cutover verification log

### 2026-11-23

- Full decrypt check against production: 193/193 expenses, 0 failures.
- Production counts: 11 users, 193 expenses, `enc_v=0` 0, missing ciphertext/IV 0,
  176 legacy plaintext rows.
- `npm run mig05:dry-run`: passed; no DDL applied.
- Pre-cutover backup:
  `expense-tracker-20261122T084242Z-mig05.sql.gpg`
  (SHA-256 `1f3fb6cb6190adb71f4e17dfe2a011e84c172835728cfada00099501ea4c2ccb`),
  restored into a scratch MySQL 8.0.46 database; counts and all five table
  checksums matched production.
- Off-host backup copy completed by the owner on 2026-11-23.

## Post-cutover verification log

### 2026-11-23

- DDL applied: 193 expenses, `enc_v0=0`, missing encrypted data 0.
- Deployed PR #62; `main` = `83a4a3f`.
- Production schema: `description` and `temp_description_*` gone;
  `description_enc`/`description_iv` NOT NULL; `enc_v` default 1.
- Phase B verification: 193/193 rows decrypted, 0 failures,
  `legacy_plaintext=0`.
- API smoke test with a temporary user: register, create, recent, update,
  delete; DB row verified encrypted; temporary user/expenses removed.
- Post-cleanup counts: 11 users, 193 expenses, no `temp_*`/`*_legacy`
  columns.
- Off-host backup copy confirmed by the owner.

## Follow-ups

- Normalize expense `date` on the server (or tighten the schema): the API
  accepts any string up to 40 chars, but MySQL `TIMESTAMP` rejects ISO 8601
  values with a trailing `Z`. The frontend sends `YYYY-MM-DD`, so the app is
  unaffected; a smoke test using `new Date().toISOString()` returned 500.
- Keep the pre-cutover backup and passphrase until the rollback window closes.
