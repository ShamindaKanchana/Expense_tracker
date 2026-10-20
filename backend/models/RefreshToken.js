const crypto = require('crypto');
const db = require('../config/db');

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_TOKEN_EXPIRY_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRY_DAYS || 30
);

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    replaced_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_token_hash (token_hash),
    INDEX idx_rt_user (user_id),
    INDEX idx_rt_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const initTable = async () => {
  try {
    await db.query(createTableQuery);
    console.log('✅ Refresh tokens table is ready');
  } catch (err) {
    console.error('❌ Error creating refresh_tokens table:', err.message);
    throw err;
  }
};

initTable().catch(console.error);

// AUTH-02: opaque refresh tokens, stored only as SHA-256 hashes. The raw
// token leaves the server exactly once (in the Set-Cookie header); anything
// in the DB is useless without the ENC_KEY-less hash preimage. Rotation on
// every refresh; reuse of an already-rotated token is treated as theft and
// revokes every session for that user.

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

class RefreshToken {
  /** @returns {{token: string, expiresAt: Date, rowId: number}} raw token shown once */
  static async issue(userId, ip = null) {
    const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const result = await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt]
    );

    return { token, expiresAt, rowId: result.insertId };
  }

  /**
   * Validate + rotate. Returns { error } or { userId, token, expiresAt }.
   * - unknown/expired/revoked → 'invalid'
   * - revoked-but-known (already rotated) → 'reuse_detected': every session
   *   for the user is revoked before failing.
   */
  static async rotate(presentedToken) {
    const tokenHash = hashToken(presentedToken);
    const rows = await db.query(
      `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = ?`,
      [tokenHash]
    );
    const row = rows && rows[0];
    if (!row) return { error: 'invalid' };

    if (row.revoked_at) {
      // Replay of a rotated token — assume theft, kill all sessions.
      await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
         WHERE user_id = ? AND revoked_at IS NULL`,
        [row.user_id]
      );
      return { error: 'reuse_detected' };
    }

    if (new Date(row.expires_at) <= new Date()) {
      await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE id = ? AND revoked_at IS NULL`,
        [row.id]
      );
      return { error: 'invalid' };
    }

    const issued = await this.issue(row.user_id);
    await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP, replaced_by = ?
       WHERE id = ? AND revoked_at IS NULL`,
      [issued.rowId, row.id]
    );

    return { userId: row.user_id, token: issued.token, expiresAt: issued.expiresAt };
  }

  /** Revoke a single token (logout). Idempotent. */
  static async revoke(presentedToken) {
    if (!presentedToken) return false;
    const tokenHash = hashToken(presentedToken);
    const result = await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = ? AND revoked_at IS NULL`,
      [tokenHash]
    );
    return (result?.affectedRows ?? 0) > 0;
  }

  /** Revoke every live token for a user (password change, theft, delete). */
  static async revokeAllForUser(userId) {
    const result = await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId]
    );
    return result?.affectedRows ?? 0;
  }

  /** OPS-01: drop rows that expired more than `days` ago (default 90). */
  static async purgeExpired(days = 90) {
    const result = await db.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    return result?.affectedRows ?? 0;
  }
}

RefreshToken.REFRESH_TOKEN_EXPIRY_DAYS = REFRESH_TOKEN_EXPIRY_DAYS;
RefreshToken.hashToken = hashToken;

module.exports = RefreshToken;
