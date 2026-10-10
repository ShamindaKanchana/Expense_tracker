/**
 * Simple in-memory rate limiter (AUTH-04), same zero-dependency style as
 * voiceRateLimit.js. Limits are intentionally hardcoded (not env vars):
 * thresholds are not secrets — anyone can discover them by counting to the
 * first 429 — so tunability does not justify the extra config surface.
 *
 * Keyed per route (IP, or IP + account where noted) with a sliding window.
 * Responds 429 + Retry-After with a generic message (no oracle).
 *
 * Limitation: state is per-process. If the API ever runs 2+ instances behind
 * a load balancer, replace this store with Redis.
 */
const attemptsByKey = new Map();

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
  req.ip ||
  'unknown';

const createRateLimit = ({ windowMs, max, keyOf, message }) => {
  if (!windowMs || !max || typeof keyOf !== 'function') {
    throw new Error('createRateLimit requires windowMs, max, keyOf');
  }
  return (req, res, next) => {
    const key = keyOf(req, getClientIp);
    const now = Date.now();
    const active = (attemptsByKey.get(key) || []).filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (active.length >= max) {
      const retryAfter = Math.ceil((active[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({
        message: message || 'Too many requests. Please wait and try again.',
        code: 'RATE_LIMITED'
      });
    }

    active.push(now);
    attemptsByKey.set(key, active);
    next();
  };
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Login brute-force guard: 10 / 15 min per IP + account. */
const loginRateLimit = createRateLimit({
  windowMs: 15 * MINUTE,
  max: 10,
  keyOf: (req, ip) =>
    `login:${ip}:${String(
      req.body.login || req.body.identifier || req.body.username || req.body.email || ''
    )
      .trim()
      .toLowerCase()}`,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.'
});

/** Admin login: 5 / 15 min per IP (single high-value account). */
const adminLoginRateLimit = createRateLimit({
  windowMs: 15 * MINUTE,
  max: 5,
  keyOf: (req, ip) => `admin-login:${ip}`,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.'
});

/** Mass-registration guard: 5 / hour per IP. */
const registerRateLimit = createRateLimit({
  windowMs: HOUR,
  max: 5,
  keyOf: (req, ip) => `register:${ip}`,
  message: 'Too many accounts created. Please wait and try again.'
});

/** Forgot-password: 5 / hour per username + IP (each request burdens the admin). */
const forgotPasswordRateLimit = createRateLimit({
  windowMs: HOUR,
  max: 5,
  keyOf: (req, ip) => `forgot:${String(req.body.username || '').trim().toLowerCase()}:${ip}`,
  message: 'Too many reset requests. Please wait and try again.'
});

/** Reset-with-code: 10 / hour per IP (6-digit code, 30-min life — unguessable). */
const resetPasswordRateLimit = createRateLimit({
  windowMs: HOUR,
  max: 10,
  keyOf: (req, ip) => `reset:${ip}`,
  message: 'Too many reset attempts. Please wait and try again.'
});

module.exports = {
  createRateLimit,
  getClientIp,
  loginRateLimit,
  adminLoginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit
};
