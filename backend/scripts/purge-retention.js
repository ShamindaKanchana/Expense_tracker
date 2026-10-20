/**
 * OPS-01 retention purge.
 *
 * Policy (owner-confirmed 2026-10-20, docs/srs/playstore-data-safety.md):
 * - password_reset_requests rows older than 90 days are deleted outright
 *   (codes already expire in 30 min and rows are status-marked; nothing
 *   operationally useful survives 90 days). Deleting the row also removes
 *   request_ip + reject_reason + code_hash with it.
 * - Server logs are stdout-only; retention is platform-side (Render dashboard).
 * - Voice artifacts: none are persisted by design (ENC-07) — this script
 *   verifies there is nothing to purge and reports it.
 *
 * Usage:
 *   node scripts/purge-retention.js           # apply
 *   node scripts/purge-retention.js --dry-run # report only
 *
 * Scheduled nightly by server.js (see scheduleRetentionJob) unless
 * RETENTION_JOB=false.
 */

const db = require('../config/db');
const RefreshToken = require('../models/RefreshToken');

const RESET_ROWS_RETENTION_DAYS = 90;

const runPurge = async ({ dryRun = false } = {}) => {
  const report = {
    ranAt: new Date().toISOString(),
    dryRun,
    resetRowsDeleted: 0,
    refreshRowsDeleted: 0,
    voiceArtifacts: 'none-persisted-by-design'
  };

  if (dryRun) {
    const countRows = await db.query(
      `SELECT COUNT(*) AS c FROM password_reset_requests
       WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [RESET_ROWS_RETENTION_DAYS]
    );
    report.resetRowsCandidates = Number(countRows?.[0]?.c ?? 0);
    const refreshCount = await db.query(
      `SELECT COUNT(*) AS c FROM refresh_tokens
       WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [RESET_ROWS_RETENTION_DAYS]
    );
    report.refreshRowsCandidates = Number(refreshCount?.[0]?.c ?? 0);
  } else {
    const result = await db.query(
      `DELETE FROM password_reset_requests
       WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [RESET_ROWS_RETENTION_DAYS]
    );
    report.resetRowsDeleted = result?.affectedRows ?? 0;
    report.refreshRowsDeleted = await RefreshToken.purgeExpired(
      RESET_ROWS_RETENTION_DAYS
    );
  }

  return report;
};

module.exports = { runPurge, RESET_ROWS_RETENTION_DAYS };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  runPurge({ dryRun })
    .then((report) => {
      console.log('Retention purge report:', JSON.stringify(report));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Retention purge failed:', err.message);
      process.exit(1);
    });
}
