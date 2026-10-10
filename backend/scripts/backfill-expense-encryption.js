/**
 * MIG-03 backfill: encrypt legacy plaintext `description` into temp_* columns.
 *
 * Safe to re-run: only touches rows with enc_v = 0, and each UPDATE is
 * conditional (AND enc_v = 0) so concurrent dual-writes can't be clobbered.
 * Logs counts + ids only — never expense text (LOG-01).
 *
 * Usage: node scripts/backfill-expense-encryption.js [--batch=500] [--dry-run]
 */
const db = require('../config/db');
const { encryptField } = require('../utils/fieldCrypto');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);
const BATCH = Math.max(1, parseInt(args.batch || '500', 10));
const DRY_RUN = Boolean(args['dry-run']);

async function run() {
  if (!process.env.ENC_KEY) {
    console.error('❌ ENC_KEY is not set — refusing to run. See docs/security.md §8.');
    process.exit(1);
  }
  let done = 0;
  let failed = 0;
  const seenIds = new Set(); // dry-run: UPDATEs don't happen, so re-select would loop forever
  for (;;) {
    const rows = await db.query(
      'SELECT id, description FROM expenses WHERE enc_v = 0 LIMIT ?',
      [BATCH]
    );
    const fresh = (rows || []).filter((row) => !seenIds.has(row.id));
    if (fresh.length === 0) break;
    for (const row of fresh) {
      seenIds.add(row.id);
      try {
        const { enc, iv } = encryptField(row.description || '');
        if (!DRY_RUN) {
          await db.query(
            `UPDATE expenses
             SET temp_description_enc = ?, temp_description_iv = ?, enc_v = 1
             WHERE id = ? AND enc_v = 0`,
            [enc, iv, row.id]
          );
        }
        done += 1;
      } catch (err) {
        failed += 1;
        console.error(`❌ Backfill failed for expense id=${row.id}:`, err.message);
      }
    }
    console.log(`… batch done (total=${done}, failed=${failed})${DRY_RUN ? ' [dry-run]' : ''}`);
  }
  const remaining = await db.query('SELECT COUNT(*) AS c FROM expenses WHERE enc_v = 0');
  console.log(`✅ Backfill complete: encrypted=${done} failed=${failed} remaining_enc_v0=${remaining[0].c}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('❌ Backfill crashed:', err.message);
  process.exit(1);
});
