/**
 * ENC-03 backfill: minimize existing password_reset_requests.request_ip values
 * to /24 (IPv4) or /48 (IPv6). Re-runnable; rows already minimized are skipped.
 *
 * Usage:
 *   node scripts/backfill-request-ip-minimization.js --dry-run
 *   node scripts/backfill-request-ip-minimization.js
 */

const db = require('../config/db');
const PasswordResetRequest = require('../models/PasswordResetRequest');

const { minimizeIp } = PasswordResetRequest;

const run = async ({ dryRun = false } = {}) => {
  const rows = await db.query(
    `SELECT id, request_ip FROM password_reset_requests
     WHERE request_ip IS NOT NULL`
  );

  let updated = 0;
  let skipped = 0;

  for (const row of rows || []) {
    const minimized = minimizeIp(row.request_ip);
    if (minimized === row.request_ip) {
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await db.query(
        `UPDATE password_reset_requests SET request_ip = ? WHERE id = ?`,
        [minimized, row.id]
      );
    }
    updated += 1;
  }

  return { total: rows?.length || 0, updated, skipped, dryRun };
};

module.exports = { run };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  run({ dryRun })
    .then((report) => {
      console.log('request_ip minimization report:', JSON.stringify(report));
      process.exit(0);
    })
    .catch((err) => {
      console.error('request_ip minimization failed:', err.message);
      process.exit(1);
    });
}
