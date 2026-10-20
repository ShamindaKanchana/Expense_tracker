const crypto = require('crypto');
const https = require('https');

/**
 * AUTH-03: password breach check via the Have I Been Pwned k-anonymity
 * range API. Only the SHA-1 prefix (5 chars) leaves this server; the
 * comparison happens locally against the returned suffix list, so the
 * password never travels over the network.
 *
 * Availability over strictness: if HIBP is unreachable or slow the check
 * returns { checked: false } and callers proceed — we do not lock users out
 * of registration because a third party is down. The result is logged so
 * the gap is visible.
 */

const HIBP_TIMEOUT_MS = 5000;

const sha1Hex = (value) =>
  crypto.createHash('sha1').update(String(value), 'utf8').digest('hex').toUpperCase();

const checkBreached = (password) =>
  new Promise((resolve) => {
    let digest;
    try {
      digest = sha1Hex(password);
    } catch {
      return resolve({ checked: false, breached: false });
    }

    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);

    const request = https.get(
      `https://api.pwnedpasswordes.com/range/${prefix}`,
      { timeout: HIBP_TIMEOUT_MS },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          console.warn(`Breach check skipped: HTTP ${response.statusCode}`);
          return resolve({ checked: false, breached: false });
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          const breached = body.split('\n').some((line) => {
            const [hashSuffix] = line.split(':');
            return hashSuffix && hashSuffix.trim().toUpperCase() === suffix;
          });
          resolve({ checked: true, breached });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      console.warn('Breach check skipped: timeout');
      resolve({ checked: false, breached: false });
    });

    request.on('error', (err) => {
      console.warn('Breach check skipped:', err.message);
      resolve({ checked: false, breached: false });
    });
  });

module.exports = { checkBreached };
