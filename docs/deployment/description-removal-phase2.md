# Runbook: Description Removal Phase 2 (MIG-05)

| Field | Value |
|-------|--------|
| **Status** | Code ready; production cutover pending |
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

- [ ] Maintenance window agreed; users will not use the app during the cutover.
- [ ] Render backend service can be suspended and resumed, or a temporary
      `RENDER_API_KEY` + service ID is available.
- [ ] Full decrypt check passes in production (Render shell, where `ENC_KEY` is set):
      ```bash
      cd backend
      npm run verify:encryption -- --all
      ```
      Expected: `enc_v0=0`, `missing_encrypted=0`, `Decrypt full check: 193 rows, 0 failed`.
- [ ] Fresh encrypted backup created and restore-tested:
      `docs/deployment/backup-restore.md`.
- [ ] Backup and passphrase copied off-host, or an off-host destination is ready.
- [ ] Phase B code is built and ready to deploy immediately after the DDL.

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

1. [ ] Announce the maintenance window and suspend the Render backend service.
       Old code cannot run after the column rename, so do not leave the API
       serving during the DDL.
2. [ ] Take the fresh GPG backup and record row counts. Do not proceed without
       a successful restore test.
3. [ ] Run the preflight dry run in the Render shell (or against production with
       the production `ENC_KEY`):
       ```bash
       cd backend
       npm run mig05:dry-run
       ```
       Expected: 193 rows, `enc_v0=0`, `missing_encrypted=0`, every row decrypts.
4. [ ] Apply the schema migration:
       ```bash
       MIG05_CONFIRM=APPLY_PHASE_B npm run mig05:apply
       ```
       This single `ALTER TABLE` drops `description` and renames
       `temp_description_enc` → `description_enc` and
       `temp_description_iv` → `description_iv`.
5. [ ] Deploy the Phase B backend immediately.
6. [ ] Verify the deployed schema and decrypt path:
       ```bash
       npm run verify:encryption -- --phase=b --all
       ```
       Expected: no `description` or `temp_description_*` columns, `enc_v=0` is
       0, missing encrypted data is 0, and the decrypt check passes.
7. [ ] Resume the service and smoke-test:
       - Sign in.
       - Create an expense and confirm the description renders.
       - Edit and delete that expense.
       - Reload the dashboard and expense list.
       - Check Render logs for `Expense has no encrypted description` and
         `Expense decrypt failed`.
8. [ ] Update `MIG-05` / `MIG-06` in the SRS, `docs/security.md`,
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
- Remaining: off-host backup copy, maintenance window, apply, deploy.
