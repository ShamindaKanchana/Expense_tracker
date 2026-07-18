/**
 * Admin session — separate from user authStorage.
 * sessionStorage: admin session ends when the tab closes (safer for ops).
 */

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_USER_KEY = 'adminUser';

export const getAdminToken = () => sessionStorage.getItem(ADMIN_TOKEN_KEY);

export const getAdminUser = () => {
  const raw = sessionStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAdminAuth = (token, admin) => {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  if (admin != null) {
    sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
  }
};

export const clearAdminAuth = () => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
};
