/**
 * MIG-07 Phase 2 verification (read-only).
 *
 * Asserts that legacy email columns are gone and every account has a username.
 * Also warns while EMAIL_HMAC_PEPPER is still present so you can remove it from
 * the production environment after smoke tests.
 *
 * Usage:
 *   node scripts/verify-email-removal.js
 */
const db = require('../config/db');

const LEGACY_COLUMNS = ['email', 'temp_email_enc', 'temp_email_iv', 'email_hmac'];

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

async function run() {
  const problems = [];
  const present = [];
  for (const column of LEGACY_COLUMNS) {
    if (await columnExists(column)) present.push(column);
  }
  if (present.length > 0) {
    problems.push(`legacy email columns still present: ${present.join(', ')}`);
  }

  const [users] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(username IS NULL OR username = '') AS missing_username
       FROM users`
  );
  const total = Number(users.total) || 0;
  const missingUsername = Number(users.missing_username) || 0;
  if (missingUsername > 0) problems.push(`${missingUsername} users missing a username`);

  console.log('Users:', { total, missing_username: missingUsername });
  console.log('Legacy email columns:', present.length === 0 ? 'none' : present.join(', '));

  if (process.env.EMAIL_HMAC_PEPPER) {
    console.warn('⚠️  EMAIL_HMAC_PEPPER is still set; remove it from production env after smoke tests.');
  }

  if (problems.length > 0) {
    console.error('❌ MIG-07 verification failed:', problems.join('; '));
    process.exitCode = 1;
  } else {
    console.log('✅ MIG-07 Phase 2 verification passed');
  }
}

run()
  .catch((err) => {
    console.error('❌ Verification crashed:', err.message);
    process.exit(1);
  })
  .finally(() => db.pool.end());
