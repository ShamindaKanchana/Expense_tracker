const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const CODE_EXPIRY_MINUTES = 30;

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    request_ip VARCHAR(64) NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by_admin_id INT NULL,
    reject_reason TEXT NULL,
    code_hash TEXT NULL,
    code_expires_at TIMESTAMP NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pwr_status (status),
    INDEX idx_pwr_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const initTable = async () => {
  try {
    await db.query(createTableQuery);
    console.log('✅ Password reset requests table is ready');
  } catch (err) {
    console.error('❌ Error creating password_reset_requests table:', err.message);
    throw err;
  }
};

initTable().catch(console.error);

const generateCode = () => {
  // 6-digit numeric, CSPRNG
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
};

class PasswordResetRequest {
  static async createPending(userId, requestIp = null) {
    // Supersede any existing pending for this user
    await db.query(
      `UPDATE password_reset_requests
       SET status = 'rejected',
           reject_reason = 'Superseded by a new request',
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    const result = await db.query(
      `INSERT INTO password_reset_requests (user_id, status, request_ip)
       VALUES (?, 'pending', ?)`,
      [userId, requestIp]
    );

    return result.insertId;
  }

  static async listPending() {
    const rows = await db.query(
      `SELECT
         r.id,
         r.user_id,
         r.status,
         r.requested_at,
         r.reviewed_at,
         r.reviewed_by_admin_id,
         r.reject_reason,
         r.code_expires_at,
         r.used_at,
         u.username
       FROM password_reset_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.status = 'pending'
       ORDER BY r.requested_at ASC`
    );
    return rows || [];
  }

  static async findById(id) {
    const rows = await db.query(
      `SELECT r.*, u.username
       FROM password_reset_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`,
      [id]
    );
    return rows && rows[0] ? rows[0] : null;
  }

  static async approve(id, adminId) {
    const row = await this.findById(id);
    if (!row) return { error: 'not_found' };
    if (row.status !== 'pending') return { error: 'not_pending' };

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'approved',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by_admin_id = ?,
           code_hash = ?,
           code_expires_at = ?,
           reject_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [adminId, codeHash, expiresAt, id]
    );

    return {
      code,
      expiresAt,
      username: row.username,
      userId: row.user_id,
      requestId: id
    };
  }

  static async reject(id, adminId, reason = null) {
    const row = await this.findById(id);
    if (!row) return { error: 'not_found' };
    if (row.status !== 'pending') return { error: 'not_pending' };

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'rejected',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by_admin_id = ?,
           reject_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [adminId, reason, id]
    );

    return { ok: true, username: row.username };
  }

  /**
   * Find latest approved, unused, unexpired request for username.
   */
  static async findApprovedForUsername(username) {
    const rows = await db.query(
      `SELECT r.*, u.username, u.id AS uid
       FROM password_reset_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE u.username = ?
         AND r.status = 'approved'
         AND r.used_at IS NULL
         AND r.code_hash IS NOT NULL
         AND r.code_expires_at IS NOT NULL
         AND r.code_expires_at > NOW()
       ORDER BY r.reviewed_at DESC
       LIMIT 1`,
      [String(username || '').trim()]
    );
    return rows && rows[0] ? rows[0] : null;
  }

  static async complete(requestId) {
    await db.query(
      `UPDATE password_reset_requests
       SET status = 'completed',
           used_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [requestId]
    );
  }

  static async markExpiredIfNeeded(row) {
    if (
      row &&
      row.status === 'approved' &&
      row.code_expires_at &&
      new Date(row.code_expires_at) <= new Date()
    ) {
      await db.query(
        `UPDATE password_reset_requests
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'approved'`,
        [row.id]
      );
      return true;
    }
    return false;
  }
}

PasswordResetRequest.CODE_EXPIRY_MINUTES = CODE_EXPIRY_MINUTES;

module.exports = PasswordResetRequest;
