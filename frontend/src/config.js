// CRA exposes only REACT_APP_* variables at build time.
// Set REACT_APP_API_URL in .env (local) or Vercel project settings (production).
const rawUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const API_BASE_URL = rawUrl.replace(/\/$/, '');