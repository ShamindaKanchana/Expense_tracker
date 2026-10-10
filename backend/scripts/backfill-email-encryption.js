/**
 * ENC-02 backfill: encrypt legacy plaintext `email` into temp_* columns +
 * blind-index HMAC. NULL emails (username-only accounts) are skipped.
 *
 * Safe to re-run: only touches rows with NULL email_hmac AND non-NULL email;
 * each UPDATE is conditional so concurrent dual-writes can't be clobbered.
 * Logs counts + ids only — never email text (LOG-01).
 *
 * Usage: node scripts/backfill-email-encryption.js [--batch=500] [--dry-run]
 */
const db = require('../config/db');
const { encryptField, normalizeEmail, emailHmac } = require('../utils/fieldCrypto');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);
const BATCH = Math.max(1, parseInt(args.batch || '500', 10));
const DRY_RUN = Boolean(args['dry-run']);

async function run() {
  if (!process.env.ENC_KEY || !process.env.EMAIL_HMAC_PEPPER) {
    console.error('❌ ENC_KEY / EMAIL_HMAC_PEPPER not set — refusing to run. See docs/security.md §8.');
    process.exit(1);
  }
  let done = 0;
  let skipped = 0;
  let failed = 0;
  const seenIds = new Set(); // dry-run: no UPDATEs happen, so re-select would loop forever
  for (;;) {
    const rows = await db.query(
      'SELECT id, email FROM users WHERE email IS NOT NULL AND email_hmac IS NULL LIMIT ?',
      [BATCH]
    );
    const fresh = (rows || []).filter((row) => !seenIds.has(row.id));
    if (fresh.length === 0) break;
    for (const row of fresh) {
      seenIds.add(row.id);
      try {
        const norm = normalizeEmail(row.email);
        if (!norm) {
          skipped += 1;
          continue;
        }
        const { enc, iv } = encryptField(norm);
        const hmac = emailHmac(norm);
        if (!DRY_RUN) {
          await db.query(
            `UPDATE users
             SET temp_email_enc = ?, temp_email_iv = ?, email_hmac = ?
             WHERE id = ? AND email_hmac IS NULL`,
            [enc, iv, hmac, row.id]
          );
        }
        done += 1;
      } catch (err) {
        failed += 1;
        console.error(`❌ Email backfill failed for user id=${row.id}:`, err.message);
      }
    }
    console.log(`… batch done (total=${done}, skipped=${skipped}, failed=${failed})${DRY_RUN ? ' [dry-run]' : ''}`);
  }
  const remaining = await db.query(
    'SELECT COUNT(*) AS c FROM users WHERE email IS NOT NULL AND email_hmac IS NULL'
  );
  console.log(`✅ Email backfill complete: encrypted=${done} skipped=${skipped} failed=${failed} remaining=${remaining[0].c}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('❌ Email backfill crashed:', err.message);
  process.exit(1);
});
