const attemptsByUser = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const voiceRateLimit = (req, res, next) => {
  const key = String(req.user?.id || req.ip);
  const now = Date.now();
  const active = (attemptsByUser.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (active.length >= MAX_REQUESTS) {
    return res.status(429).json({
      message: 'Too many voice extraction requests. Please wait and try again.',
      code: 'VOICE_RATE_LIMITED'
    });
  }

  active.push(now);
  attemptsByUser.set(key, active);
  next();
};

module.exports = voiceRateLimit;
