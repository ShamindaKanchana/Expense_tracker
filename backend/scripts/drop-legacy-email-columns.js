/**
 * MIG-07 Phase 2 destructive schema migration.
 *
 * Drops legacy email storage after Phase 2 code is deployed and every legacy
 * user can sign in with their username.
 *
 * Usage:
 *   MIG07_CONFIRM=DROP_EMAIL_COLUMNS node scripts/drop-legacy-email-columns.js
 *
 * Safety:
 *   - Requires the explicit MIG07_CONFIRM token.
 *   - Refuses to run if required columns are missing from `users` (wrong DB).
 *   - DDL auto-commits; take a fresh verified backup first.
 *   - After this, keep EMAIL_HMAC_PEPPER only until rollback is no longer needed.
 */
const db = require('../config/db');

const CONFIRM_TOKEN = 'DROP_EMAIL_COLUMNS';
const COLUMNS = ['email', 'temp_email_enc', 'temp_email_iv', 'email_hmac'];
const INDEXES = ['idx_users_email_hmac'];

const columnExists = async (column) => {
  const rows = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = ?
      LIMIT 1`,
    [column]
  );
  return rows.length > 0;
};

const indexExists = async (index) => {
  const rows = await db.query(
    `SELECT 1
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND index_name = ?
      LIMIT 1`,
    [index]
  );
  return rows.length > 0;
};

async function run() {
  if (process.env.MIG07_CONFIRM !== CONFIRM_TOKEN) {
    console.error('Refusing to drop columns without explicit confirmation.');
    console.error(`Re-run as: MIG07_CONFIRM=${CONFIRM_TOKEN} node scripts/drop-legacy-email-columns.js`);
    console.error('Precondition: Phase 2 code is deployed and a fresh backup is verified.');
    process.exit(1);
  }

  if (!(await columnExists('username'))) {
    console.error('❌ users.username is missing — refusing to run against this database.');
    process.exit(1);
  }

  const present = [];
  for (const column of COLUMNS) {
    if (await columnExists(column)) present.push(column);
  }

  if (present.length === 0) {
    console.log('✅ No legacy email columns present; nothing to drop.');
    return;
  }

  const [total] = await db.query('SELECT COUNT(*) AS c FROM users');
  console.log('Users:', Number(total.c) || 0);
  console.log('Legacy columns present:', present.join(', '));

  if (await columnExists('email')) {
    const [legacy] = await db.query(
      'SELECT COUNT(*) AS c FROM users WHERE email IS NOT NULL'
    );
    console.log('Rows with legacy plaintext email:', Number(legacy.c) || 0);
  }

  for (const index of INDEXES) {
    if (await indexExists(index)) {
      console.log(`Dropping index ${index}…`);
      await db.query(`ALTER TABLE users DROP INDEX \`${index}\``);
    }
  }

  for (const column of present) {
    console.log(`Dropping column users.${column}…`);
    await db.query(`ALTER TABLE users DROP COLUMN \`${column}\``);
  }

  const remaining = [];
  for (const column of COLUMNS) {
    if (await columnExists(column)) remaining.push(column);
  }
  if (remaining.length > 0) {
    console.error('❌ Columns still present after drop:', remaining.join(', '));
    process.exitCode = 1;
    return;
  }

  console.log('✅ MIG-07 Phase 2 schema drop complete.');
  console.log('Next: verify username login, then remove EMAIL_HMAC_PEPPER from production env.');
}

run()
  .catch((err) => {
    console.error('❌ Email column drop failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.pool.end());
