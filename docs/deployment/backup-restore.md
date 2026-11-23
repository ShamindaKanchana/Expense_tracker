# Runbook: Production Backup and Restore Test

| Field | Value |
|-------|--------|
| **Status** | Restore test PASSED 2026-11-14 and again for the 2026-11-22 MIG-07 pre-cutover backup |
| **Related** | `OPS-02` in [../srs/playstore-data-safety.md](../srs/playstore-data-safety.md) |
| **Goal** | Prove a production backup can be restored into a scratch database with matching row counts and valid encryption metadata before any destructive migration |

> Do not run `mysqldump` from a machine that writes to production, and do not
> put a database password on the command line (it leaks via shell history and
> process lists).

## Preconditions

- [ ] Aiven console access, or a read-only MySQL user for dumping.
- [ ] A scratch MySQL database (never restore over production).
- [x] GPG symmetric passphrase (or public key) with the passphrase stored separately.
- [x] `mysqldump`, `mysql`, and `gpg` installed.
- [x] `backend/.env` was used only for the read-only dump, not local app writes.

## 1. Prefer the provider backup

- [ ] Confirm Aiven automated backups are enabled and note the retention window.
- [ ] Confirm Aiven disk encryption at rest in the Aiven console.
- [ ] For this restore test, create a temporary Aiven service/branch from the
  latest backup if available, or use the manual dump path below.

## 2. Create an encrypted manual dump

Use a MySQL option file instead of `-p<password>`:

```bash
umask 077
cat > /tmp/expense-tracker-backup.cnf <<'EOF'
[client]
host=REPLACE_ME
user=REPLACE_ME
password=REPLACE_ME
port=REPLACE_ME
ssl-mode=VERIFY_IDENTITY
ssl-ca=/path/to/aiven-ca.pem
EOF

mysqldump \
  --defaults-extra-file=/tmp/expense-tracker-backup.cnf \
  --single-transaction --quick --routines --triggers --events \
  REPLACE_DB_NAME \
  | gpg --encrypt --recipient REPLACE_GPG_RECIPIENT \
  > expense-tracker-$(date -u +%Y%m%dT%H%M%SZ).sql.gpg

rm -f /tmp/expense-tracker-backup.cnf
```

- [ ] Store the encrypted dump outside the repo.
- [ ] Record the backup timestamp, size, and checksum.

## 3. Restore into a scratch database

```bash
mysql --defaults-extra-file=/tmp/scratch.cnf \
  -e 'CREATE DATABASE expense_tracker_restore'

gpg --decrypt expense-tracker-YYYYMMDDTHHMMSSZ.sql.gpg \
  | mysql --defaults-extra-file=/tmp/scratch.cnf expense_tracker_restore
```

## 4. Verify the restore

Run against the **scratch** database:

```sql
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS expenses FROM expenses;
SELECT COUNT(*) AS plaintext_expenses
  FROM expenses WHERE enc_v = 0;
```

Choose the encrypted-column names that match the backup's schema:

```sql
-- Pre-MIG-05 Phase B backups
SELECT COUNT(*) AS missing_ciphertext
  FROM expenses
  WHERE temp_description_enc IS NULL OR temp_description_iv IS NULL;
SELECT COUNT(*) AS legacy_description_rows
  FROM expenses WHERE description IS NOT NULL AND description <> '';

-- Post-MIG-05 Phase B backups
SELECT COUNT(*) AS missing_ciphertext
  FROM expenses
  WHERE description_enc IS NULL OR description_iv IS NULL;
```

If the backup predates MIG-07 Phase 2, also check:

```sql
SELECT COUNT(*) AS legacy_email_rows
  FROM users WHERE email IS NOT NULL;
```

- [ ] Row counts match the pre-backup values.
- [ ] `enc_v = 0` is 0.
- [ ] `missing_ciphertext` is 0.
- [ ] Record the legacy-row counts expected before the relevant phase.
- [ ] Optionally point a local backend at the scratch DB and run
  `npm run verify:encryption -- --sample=5`.
- [ ] Drop the scratch database after recording the result.

## 5. Record the result

- [ ] Restore date and operator.
- [ ] Backup source (Aiven automated / manual GPG dump).
- [ ] Row-count comparison.
- [ ] Any errors and how they were resolved.
- [ ] Update `OPS-02` in the SRS.

## 6. Test log

### 2026-11-22 — MIG-07 pre-cutover backup

- Source: production Aiven MySQL over TLS (`ssl-mode=REQUIRED`; no local
  `DB_CA_CERT`, so CA identity was not verified — same caveat as the 2026-11-14 test).
- Tool: `mysqldump --single-transaction --quick --routines --triggers --events --no-tablespaces`.
- Encryption: `gpg --symmetric --cipher-algo AES256`; passphrase stored outside the repo.
- Artifact: `expense-tracker-20261122T072352Z.sql.gpg` (21 KB).
- SHA-256: `26b347a2492b2fca80a4f513f4b4691ee4ca09a480637fa0bd9c9376c5c93b50`.
- Restore: decrypted directly into a scratch MySQL 8.0.46 database; no plaintext file written.
- Counts before/after: users 11/11, expenses 193/193, legacy email rows 4/4,
  `enc_v=0` 0/0, missing ciphertext 0/0.
- Checksums matched for `users`, `expenses`, `password_reset_requests`,
  `refresh_tokens`, and `admins`.
- Cleanup: scratch database and temporary MySQL data directory removed.
- **Owner action:** copy the encrypted dump and passphrase off-host; the local
  copy alone is not a durable backup. Aiven disk-encryption confirmation still
  needs console verification.

### 2026-11-22 — MIG-05 Phase B pre-cutover backup

- Source: production Aiven MySQL over TLS (`ssl-mode=REQUIRED`; no local
  `DB_CA_CERT`, so CA identity was not verified).
- Tool: `mysqldump --single-transaction --quick --routines --triggers --events --no-tablespaces`.
- Encryption: `gpg --symmetric --cipher-algo AES256`; passphrase from
  `~/.config/expense-tracker/backup-passphrase` (not in the repo).
- Artifact: `expense-tracker-20261122T084242Z-mig05.sql.gpg` (21 KB).
- SHA-256: `1f3fb6cb6190adb71f4e17dfe2a011e84c172835728cfada00099501ea4c2ccb`.
- Restore: decrypted directly into a scratch MySQL 8.0.46 database; no plaintext file written.
- Counts: users 11/11, expenses 193/193, `enc_v=0` 0/0, missing ciphertext 0/0,
  legacy description rows 176/176.
- Checksums matched production for `users`, `expenses`,
  `password_reset_requests`, `refresh_tokens`, and `admins`.
- Cleanup: scratch database and Docker container removed.
- **Owner action:** copy the encrypted dump and passphrase off-host; the local
  copy alone is not a durable backup.
