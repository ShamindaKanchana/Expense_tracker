/**
 * ENC-04 migration: structure existing password_reset_requests.reject_reason values.
 *
 * - 'Superseded by a new request' → reject_reason_code='superseded', text cleared.
 * - Any other legacy free text → reject_reason_code='other', text re-stored
 *   AES-256-GCM-encrypted (ENC-01 envelope), capped at 140 chars.
 * - Rows already structured (reject_reason_code IS NOT NULL) are skipped.
 *
 * Requires ENC_KEY (and re-running is safe). Rejected rows are purged with their
 * row by OPS-01 after 90 days anyway; this protects the interim.
 *
 * Usage:
 *   node scripts/migrate-reject-reason.js --dry-run
 *   node scripts/migrate-reject-reason.js
 */

const db = require('../config/db');
const PasswordResetRequest = require('../models/PasswordResetRequest');

const LEGACY_SUPERSEDED = 'Superseded by a new request';

const run = async ({ dryRun = false } = {}) => {
  const rows = await db.query(
    `SELECT id, reject_reason, reject_reason_code
     FROM password_reset_requests
     WHERE reject_reason_code IS NULL AND reject_reason IS NOT NULL`
  );

  let superseded = 0;
  let encrypted = 0;
  let cleared = 0;

  for (const row of rows || []) {
    const text = String(row.reject_reason || '');

    if (text === LEGACY_SUPERSEDED) {
      if (!dryRun) {
        await db.query(
          `UPDATE password_reset_requests
           SET reject_reason_code = 'superseded', reject_reason = NULL
           WHERE id = ?`,
          [row.id]
        );
      }
      superseded += 1;
      continue;
    }

    // Any other legacy text: treat as 'other' and encrypt (cap 140 per ENC-04).
    const { enc, iv } = require('../utils/fieldCrypto').encryptField(
      text.slice(0, PasswordResetRequest.REJECT_NOTE_MAX)
    );
    if (!dryRun) {
      await db.query(
        `UPDATE password_reset_requests
         SET reject_reason_code = 'other', reject_reason = ?
         WHERE id = ?`,
        [JSON.stringify({ enc, iv, v: 1 }), row.id]
      );
    }
    encrypted += 1;
  }

  // Also tag superseded-looking rows that already have a code? None expected.
  if (!dryRun) {
    const remaining = await db.query(
      `SELECT COUNT(*) AS c FROM password_reset_requests
       WHERE reject_reason_code IS NULL AND reject_reason IS NOT NULL`
    );
    cleared = Number(remaining?.[0]?.c ?? 0);
  }

  return {
    total: rows?.length || 0,
    superseded,
    encrypted,
    remainingUnstructured: dryRun ? 'n/a' : cleared,
    dryRun
  };
};

module.exports = { run };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  run({ dryRun })
    .then((report) => {
      console.log('reject_reason migration report:', JSON.stringify(report));
      process.exit(0);
    })
    .catch((err) => {
      console.error('reject_reason migration failed:', err.message);
      process.exit(1);
    });
}
