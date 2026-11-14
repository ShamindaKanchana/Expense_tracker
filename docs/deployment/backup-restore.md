# Runbook: Production Backup and Restore Test

| Field | Value |
|-------|--------|
| **Status** | Checklist — restore test still pending owner execution |
| **Related** | `OPS-02` in [../srs/playstore-data-safety.md](../srs/playstore-data-safety.md) |
| **Goal** | Prove a production backup can be restored into a scratch database with matching row counts and valid encryption metadata before any destructive migration |

> Do not run `mysqldump` from a machine that writes to production, and do not
> put a database password on the command line (it leaks via shell history and
> process lists).

## Preconditions

- [ ] Aiven console access, or a read-only MySQL user for dumping.
- [ ] A scratch MySQL database (never restore over production).
- [ ] A GPG key for manual dumps; the private key is stored separately.
- [ ] `mysqldump`, `mysql`, and `gpg` installed.
- [ ] `backend/.env` is **not** pointed at production for local app tests.

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
SELECT COUNT(*) AS missing_ciphertext
  FROM expenses
  WHERE temp_description_enc IS NULL OR temp_description_iv IS NULL;
SELECT COUNT(*) AS legacy_description_rows
  FROM expenses WHERE description IS NOT NULL AND description <> '';
SELECT COUNT(*) AS legacy_email_rows
  FROM users WHERE email IS NOT NULL;
```

- [ ] Row counts match the pre-backup values.
- [ ] `enc_v = 0` is 0.
- [ ] `missing_ciphertext` is 0.
- [ ] Record the legacy-row counts expected before `MIG-05`/`MIG-07` Phase 2.
- [ ] Optionally point a local backend at the scratch DB and run
  `npm run verify:encryption -- --sample=5`.
- [ ] Drop the scratch database after recording the result.

## 5. Record the result

- [ ] Restore date and operator.
- [ ] Backup source (Aiven automated / manual GPG dump).
- [ ] Row-count comparison.
- [ ] Any errors and how they were resolved.
- [ ] Update `OPS-02` in the SRS.
