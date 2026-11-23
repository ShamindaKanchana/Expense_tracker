/**
 * MIG-05 Phase B destructive schema migration.
 *
 * Removes the legacy plaintext `expenses.description` column and renames the
 * encrypted `temp_description_*` columns to their permanent names.
 *
 * Usage:
 *   node scripts/apply-mig05-phase-b.js --dry-run
 *   MIG05_CONFIRM=APPLY_PHASE_B node scripts/apply-mig05-phase-b.js
 *
 * Safety:
 *   - Requires ENC_KEY and decrypts every expense before touching the schema.
 *   - Refuses if any row is unencrypted or fails decryption.
 *   - Requires the explicit MIG05_CONFIRM token for the real migration.
 *   - DDL auto-commits; take a fresh verified backup first and stop writes.
 */
const db = require('../config/db');
const { decryptField } = require('../utils/fieldCrypto');

const CONFIRM_TOKEN = 'APPLY_PHASE_B';
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value === undefined ? true : value];
  })
);
const DRY_RUN = Boolean(args['dry-run']);

const count = (value) => Number(value) || 0;

const columnExists = async (column) => {
  const rows = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'expenses'
        AND column_name = ?
      LIMIT 1`,
    [column]
  );
  return rows.length > 0;
};

async function preflight() {
  if (!process.env.ENC_KEY) {
    console.error('❌ ENC_KEY is not set — refusing to touch encrypted data.');
    process.exit(1);
  }

  const hasLegacy = await columnExists('description');
  const hasTempEnc = await columnExists('temp_description_enc');
  const hasTempIv = await columnExists('temp_description_iv');
  const hasNewEnc = await columnExists('description_enc');
  const hasNewIv = await columnExists('description_iv');

  if (!hasLegacy && !hasTempEnc && !hasTempIv && hasNewEnc && hasNewIv) {
    console.log('✅ MIG-05 Phase B is already applied; nothing to do.');
    return { alreadyApplied: true };
  }

  if (hasNewEnc || hasNewIv) {
    throw new Error(
      'Unexpected partial schema: description_enc/description_iv already exist. Refusing to continue.'
    );
  }

  if (!hasLegacy || !hasTempEnc || !hasTempIv) {
    throw new Error(
      'Expected the legacy description and temp_description_* columns. Refusing to run against this database.'
    );
  }

  const [row] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(enc_v = 0) AS enc_v0,
           SUM(temp_description_enc IS NULL OR temp_description_iv IS NULL) AS missing_encrypted,
           SUM(description IS NOT NULL AND description <> '') AS legacy_plaintext
      FROM expenses
  `);

  const total = count(row.total);
  const encV0 = count(row.enc_v0);
  const missing = count(row.missing_encrypted);
  const legacyPlaintext = count(row.legacy_plaintext);

  console.log('Expenses:', {
    total,
    enc_v0: encV0,
    missing_encrypted: missing,
    legacy_plaintext: legacyPlaintext
  });

  if (encV0 > 0) throw new Error('Refusing: some expenses still have enc_v = 0.');
  if (missing > 0) throw new Error('Refusing: some expenses are missing encrypted description data.');

  const rows = await db.query(
    `SELECT id, temp_description_enc AS enc, temp_description_iv AS iv
       FROM expenses
      ORDER BY id`
  );

  let decryptFailures = 0;
  for (const expense of rows) {
    try {
      decryptField(expense.enc, expense.iv);
    } catch (err) {
      decryptFailures += 1;
      console.error(`❌ Expense decrypt failed for id=${expense.id}:`, err.message);
    }
  }
  console.log(`Decrypt check: ${rows.length} rows, ${decryptFailures} failed`);

  if (decryptFailures > 0) {
    throw new Error('Refusing: not every expense decrypts with the current ENC_KEY.');
  }

  return { alreadyApplied: false, total, legacyPlaintext };
}

async function run() {
  if (!DRY_RUN && process.env.MIG05_CONFIRM !== CONFIRM_TOKEN) {
    console.error('Refusing to apply the destructive migration without confirmation.');
    console.error(
      `Re-run as: MIG05_CONFIRM=${CONFIRM_TOKEN} node scripts/apply-mig05-phase-b.js`
    );
    console.error('Precondition: fresh verified backup and a maintenance window.');
    process.exit(1);
  }

  const state = await preflight();
  if (state.alreadyApplied) return;

  if (DRY_RUN) {
    console.log('✅ Dry run passed: legacy columns are safe to drop. No DDL applied.');
    return;
  }

  console.log('Applying MIG-05 Phase B schema changes…');
  await db.query(`
    ALTER TABLE expenses
      DROP COLUMN description,
      CHANGE COLUMN temp_description_enc description_enc TEXT NOT NULL,
      CHANGE COLUMN temp_description_iv description_iv VARCHAR(32) NOT NULL,
      MODIFY COLUMN enc_v INT NOT NULL DEFAULT 1
  `);

  if (await columnExists('description')) {
    throw new Error('description still exists after the migration.');
  }
  if (await columnExists('temp_description_enc') || await columnExists('temp_description_iv')) {
    throw new Error('temp_description_* still exists after the migration.');
  }
  if (!(await columnExists('description_enc')) || !(await columnExists('description_iv'))) {
    throw new Error('Permanent encrypted columns are missing after the migration.');
  }

  const [row] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(enc_v = 0) AS enc_v0,
           SUM(description_enc IS NULL OR description_iv IS NULL) AS missing_encrypted
      FROM expenses
  `);

  if (count(row.enc_v0) > 0 || count(row.missing_encrypted) > 0) {
    throw new Error(
      `Post-migration verification failed (enc_v0=${count(row.enc_v0)}, missing=${count(row.missing_encrypted)}).`
    );
  }

  console.log(
    `✅ MIG-05 Phase B applied: ${count(row.total)} expenses, enc_v0=0, missing=0.`
  );
  console.log('Next: deploy the Phase B backend and run verify:encryption --phase=b.');
}

run()
  .catch((err) => {
    console.error('❌ MIG-05 Phase B failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.pool.end());
