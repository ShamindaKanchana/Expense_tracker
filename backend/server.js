require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Render terminates TLS at the edge; trust the proxy so protocol/secure
// cookie logic sees the real client scheme (TLS-01).
app.set('trust proxy', 1);

// CORS configuration — set CORS_ALLOWED_ORIGINS as comma-separated URLs in production
const isDevelopment = process.env.NODE_ENV === 'development';
const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultDevOrigins;

const corsOptions = {
  origin(origin, callback) {
    // In development or for non-browser clients (no origin header), allow everything
    if (isDevelopment || !origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      // Explicitly echo back the requesting origin so browsers accept the response
      return callback(null, origin);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

console.log(`Server running in ${isDevelopment ? 'development' : 'production'} mode`);

// TLS-02: security headers. Helmet defaults (nosniff, frameguard/deny,
// hsts, referrer-policy, etc.). CSP is irrelevant for JSON API responses —
// the SPA is served by Vercel / loaded from the Capacitor origin — so the
// default policy is kept without app-specific directives.
app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  })
);

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes
app.use(express.json());

// Initialize MySQL models (tables will be created if not exist)
require('./models/User');
require('./models/Expense');
require('./models/Admin');
require('./models/PasswordResetRequest');
require('./models/RefreshToken');

// Routes
app.use('/api/auth', require('./routes/auth'));

// Expense routes
app.use('/api/expenses', require('./routes/expenses'));

// Voice expense draft extraction (never writes to the database)
app.use('/api/voice-expenses', require('./routes/voiceExpenses'));

// Admin routes (not linked from the user app — see docs/srs/admin-panel.md)
app.use('/api/admin', require('./routes/admin'));

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running');
});

// Return JSON errors (not HTML pages) so the React app can show messages in the UI.
// LOG-01: raw err.message can carry SQL/stack details — only surfaced to clients in
// development. Production clients get the message for intentional 4xx errors and a
// generic string for 5xx; full detail stays in server logs only.
app.use((err, req, res, next) => {
  console.error('API error:', err.message);
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';
  const message =
    status < 500 || isDev ? err.message || 'Server error' : 'Server error';
  res.status(status).json({
    message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleRetentionJob();
});

// OPS-01: nightly retention purge (reset rows > 90d; voice = none persisted).
// Runs once at boot (if due) then re-arms for the next 03:00 server time.
// Disable with RETENTION_JOB=false (e.g. one-off maintenance instances).
function scheduleRetentionJob() {
  if (process.env.RETENTION_JOB === 'false') {
    console.log('Retention job disabled via RETENTION_JOB=false');
    return;
  }

  const { runPurge } = require('./scripts/purge-retention');

  const msUntilNext3am = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  };

  const runAndRearm = async () => {
    try {
      const report = await runPurge();
      console.log('Retention purge report:', JSON.stringify(report));
    } catch (err) {
      console.error('Retention purge failed:', err.message);
    } finally {
      setTimeout(runAndRearm, 24 * 60 * 60 * 1000);
    }
  };

  // First arm: wait until the next 3am, then daily.
  setTimeout(runAndRearm, msUntilNext3am());
}
