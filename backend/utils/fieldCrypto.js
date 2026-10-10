const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, fresh per row
const KEY_BYTES = 32;

/**
 * Field-level encryption for sensitive text columns (ENC-01/ENC-02).
 *
 * - AES-256-GCM: confidentiality + tamper detection (wrong key or edited
 *   ciphertext fails decrypt loudly instead of returning forged text).
 * - Fresh random IV per row: identical plaintexts encrypt differently.
 * - Key comes ONLY from server env (ENC_KEY, base64 32B). Never in repo,
 *   frontend bundle, or logs. Dev key must differ from prod (ENC-05).
 */
const getKey = () => {
  const raw = process.env.ENC_KEY ? String(process.env.ENC_KEY).trim() : '';
  if (!raw) {
    throw new Error(
      'ENC_KEY is not set — refusing to encrypt/decrypt (see docs/security.md §8).'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENC_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  return key;
};

/** @returns {{enc: string, iv: string}} base64 ciphertext + iv */
const encryptField = (plaintext) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const text = plaintext == null ? '' : String(plaintext);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store tag prepended so decrypt needs only (enc, iv).
  return {
    enc: Buffer.concat([tag, enc]).toString('base64'),
    iv: iv.toString('base64')
  };
};

/** @returns {string} plaintext; throws on wrong key or tampered data */
const decryptField = (enc, iv) => {
  const key = getKey();
  const raw = Buffer.from(String(enc), 'base64');
  const nonce = Buffer.from(String(iv), 'base64');
  if (nonce.length !== IV_BYTES) {
    throw new Error('Invalid IV for field decryption.');
  }
  const tag = raw.subarray(0, 16);
  const data = raw.subarray(16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

module.exports = { encryptField, decryptField, getKey };
