/**
 * MIG-05/MIG-07 verification (read-only).
 *
 * Reports encrypted coverage, legacy plaintext presence, newest-row write
 * behaviour, and a decrypt smoke test. Never prints row contents.
 *
 * Usage:
 *   node scripts/verify-encryption-migration.js
 *   node scripts/verify-encryption-migration.js --phase=b
 *   node scripts/verify-encryption-migration.js --sample=10
 *
 * Phase A checks that every row has a usable encrypted copy and that writes
 * are no longer creating new plaintext. Phase B additionally requires the
 * legacy columns to be gone and the temp_* columns to be renamed.
 */
const db = require('../config/db');
const { decryptField } = require('../utils/fieldCrypto');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value === undefined ? true : value];
  })
);
const PHASE = String(args.phase || 'a').toLowerCase();
const SAMPLE = Math.max(0, parseInt(args.sample || '5', 10));

const columnExists = async (table, column) => {
  const rows = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
};

const count = (value) => Number(value) || 0;

async function run() {
  if (!process.env.ENC_KEY) {
    console.error('❌ ENC_KEY is not set — cannot verify encrypted rows.');
    process.exit(1);
  }

  const problems = [];

  const hasExpenseLegacy = await columnExists('expenses', 'description');
  const hasUserLegacy = await columnExists('users', 'email');
  const expenseEnc = (await columnExists('expenses', 'description_enc'))
    ? 'description_enc'
    : 'temp_description_enc';
  const expenseIv = (await columnExists('expenses', 'description_iv'))
    ? 'description_iv'
    : 'temp_description_iv';
  const userEnc = (await columnExists('users', 'email_enc'))
    ? 'email_enc'
    : 'temp_email_enc';
  const userIv = (await columnExists('users', 'email_iv'))
    ? 'email_iv'
    : 'temp_email_iv';

  if (!(await columnExists('expenses', expenseEnc))) {
    problems.push('expenses has no encrypted description column');
  }
  if (!(await columnExists('users', userEnc))) {
    problems.push('users has no encrypted email column');
  }

  const expenseSelect = hasExpenseLegacy
    ? `SUM(description IS NOT NULL AND description <> '') AS legacy_plaintext`
    : '0 AS legacy_plaintext';
  const userSelect = hasUserLegacy
    ? `SUM(email IS NOT NULL) AS legacy_plaintext,
       SUM(email IS NOT NULL AND ${userEnc} IS NULL) AS legacy_only`
    : '0 AS legacy_plaintext, 0 AS legacy_only';

  const [expenses] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(enc_v = 0) AS enc_v0,
           SUM(${expenseEnc} IS NULL OR ${expenseIv} IS NULL) AS missing_encrypted,
           ${expenseSelect}
      FROM expenses
  `);
  const [users] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(${userEnc} IS NOT NULL AND ${userIv} IS NOT NULL) AS encrypted,
           SUM(email_hmac IS NOT NULL) AS hmac,
           ${userSelect}
      FROM users
  `);

  console.log('Expenses:', {
    total: count(expenses.total),
    enc_v0: count(expenses.enc_v0),
    missing_encrypted: count(expenses.missing_encrypted),
    legacy_plaintext: count(expenses.legacy_plaintext)
  });
  console.log('Users:', {
    total: count(users.total),
    encrypted: count(users.encrypted),
    hmac: count(users.hmac),
    legacy_plaintext: count(users.legacy_plaintext),
    legacy_only: count(users.legacy_only)
  });

  if (count(expenses.enc_v0) > 0) problems.push('expenses still have enc_v = 0');
  if (count(expenses.missing_encrypted) > 0) problems.push('expenses missing encrypted description');
  if (count(users.legacy_only) > 0) problems.push('users still have legacy-only email');

  const newest = await db.query(`
    SELECT id, created_at${hasExpenseLegacy
      ? ', (description IS NOT NULL AND description <> \'\') AS has_legacy_plaintext'
      : ', 0 AS has_legacy_plaintext'}
      FROM expenses
     ORDER BY id DESC
     LIMIT 5
  `);
  console.log('Newest expenses:', newest);

  let decryptFailures = 0;
  if (SAMPLE > 0) {
    const expenseRows = await db.query(
      `SELECT id, ${expenseEnc} AS enc, ${expenseIv} AS iv
         FROM expenses
        WHERE ${expenseEnc} IS NOT NULL AND ${expenseIv} IS NOT NULL
        ORDER BY id DESC
        LIMIT ?`,
      [SAMPLE]
    );
    for (const row of expenseRows) {
      try {
        decryptField(row.enc, row.iv);
      } catch (err) {
        decryptFailures += 1;
        console.error(`❌ Expense decrypt failed for id=${row.id}:`, err.message);
      }
    }

    const userRows = await db.query(
      `SELECT id, ${userEnc} AS enc, ${userIv} AS iv
         FROM users
        WHERE ${userEnc} IS NOT NULL AND ${userIv} IS NOT NULL
        ORDER BY id DESC
        LIMIT ?`,
      [SAMPLE]
    );
    for (const row of userRows) {
      try {
        decryptField(row.enc, row.iv);
      } catch (err) {
        decryptFailures += 1;
        console.error(`❌ User decrypt failed for id=${row.id}:`, err.message);
      }
    }
    console.log(`Decrypt smoke test: ${expenseRows.length + userRows.length} rows, ${decryptFailures} failed`);
  }
  if (decryptFailures > 0) problems.push('decrypt smoke test failed');

  if (PHASE === 'b') {
    if (hasExpenseLegacy) problems.push('expenses.description still exists');
    if (hasUserLegacy) problems.push('users.email still exists');
    if (await columnExists('expenses', 'temp_description_enc')) {
      problems.push('expenses.temp_description_enc was not renamed');
    }
    if (await columnExists('users', 'temp_email_enc')) {
      problems.push('users.temp_email_enc was not renamed');
    }
  }

  if (problems.length > 0) {
    console.error('❌ Verification failed:', problems.join('; '));
    process.exitCode = 1;
  } else {
    console.log(`✅ Phase ${PHASE.toUpperCase()} verification passed`);
  }
}

run()
  .catch((err) => {
    console.error('❌ Verification crashed:', err.message);
    process.exit(1);
  })
  .finally(() => db.pool.end());
