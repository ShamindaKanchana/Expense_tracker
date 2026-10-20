const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const net = require('net');
const db = require('../config/db');
const { encryptField } = require('../utils/fieldCrypto');

const CODE_EXPIRY_MINUTES = 30;

// ENC-04: reject_reason is structured — a closed enum code (plaintext column,
// useful for ops queries) plus an optional free-text note (≤140 chars) that is
// AES-256-GCM-encrypted with the same envelope as ENC-01 before storage.
const REJECT_CODES = ['invalid_user', 'duplicate', 'abuse', 'other', 'superseded'];
const REJECT_NOTE_MAX = 140;

// ENC-03: minimize stored IPs. /24 for IPv4, /48 for IPv6 — enough for
// abuse-source attribution, not enough to re-identify a household/account.
// Unrecognized values are dropped (NULL) rather than stored raw.
const minimizeIp = (ip) => {
  if (!ip || typeof ip !== 'string') return null;
  const value = ip.trim().replace(/^::ffff:/i, '');
  if (!value) return null;

  if (net.isIPv4(value)) {
    const parts = value.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  if (net.isIPv6(value)) {
    // Collapse to the first 3 hextets (e.g. 2001:db8:abcd::)
    const hextets = value.split(':').filter((h) => h !== '');
    if (hextets.length < 3) return null;
    return `${hextets[0]}:${hextets[1]}:${hextets[2]}::`;
  }

  return null;
};

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
    reject_reason_code VARCHAR(20) NULL,
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
    // ENC-04: converge existing tables onto the structured reject_reason schema.
    try {
      await db.query(
        `ALTER TABLE password_reset_requests
         ADD COLUMN reject_reason_code VARCHAR(20) NULL AFTER reject_reason`
      );
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err; // already present
    }
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

// ENC-04: note is stored AES-256-GCM-encrypted inside the existing
// reject_reason TEXT column as a small JSON envelope (same primitives as
// ENC-01). The enum code lives in reject_reason_code (plaintext, ops-safe).
const encryptRejectNote = (note) => {
  const { enc, iv } = encryptField(note);
  return JSON.stringify({ enc, iv, v: 1 });
};

class PasswordResetRequest {
  static async createPending(userId, requestIp = null) {
    // Supersede any existing pending for this user
    await db.query(
      `UPDATE password_reset_requests
       SET status = 'rejected',
           reject_reason_code = 'superseded',
           reject_reason = NULL,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND status = 'pending'`,
      [userId]
    );

    const result = await db.query(
      `INSERT INTO password_reset_requests (user_id, status, request_ip)
       VALUES (?, 'pending', ?)`,
      [userId, minimizeIp(requestIp)]
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
         r.reject_reason_code,
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

  static async reject(id, adminId, code = null, note = null) {
    const row = await this.findById(id);
    if (!row) return { error: 'not_found' };
    if (row.status !== 'pending') return { error: 'not_pending' };

    const safeCode = REJECT_CODES.includes(code) ? code : 'other';
    const trimmedNote =
      note == null || String(note).trim() === ''
        ? null
        : String(note).trim().slice(0, REJECT_NOTE_MAX);
    const encryptedNote = trimmedNote ? encryptRejectNote(trimmedNote) : null;

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'rejected',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by_admin_id = ?,
           reject_reason_code = ?,
           reject_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [adminId, safeCode, encryptedNote, id]
    );

    return { ok: true, username: row.username, code: safeCode };
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
PasswordResetRequest.minimizeIp = minimizeIp;
PasswordResetRequest.REJECT_CODES = REJECT_CODES;
PasswordResetRequest.REJECT_NOTE_MAX = REJECT_NOTE_MAX;

module.exports = PasswordResetRequest;
