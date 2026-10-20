import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getErrorMessage } from '../utils/errorMessage';
import { clearAuth, getToken } from '../utils/authStorage';
import { clearAdminAuth, getAdminToken } from '../utils/adminStorage';

const API_URL = API_BASE_URL;

const toRequestError = (error, fallback) => {
  const message = getErrorMessage(error, fallback);
  const requestError = new Error(message);
  requestError.code = error.response?.data?.code;
  requestError.status = error.response?.status;
  return requestError;
};

if (process.env.NODE_ENV === 'development') {
  console.log(`API base URL: ${API_URL}`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  // AUTH-02: send/accept the httpOnly refresh cookie (Set-Cookie on login).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the correct token for user vs admin API calls
api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const isAdminApi = url.includes('/admin');
    const isAdminLogin = /\/admin\/login/.test(url);

    if (isAdminApi && !isAdminLogin) {
      const token = getAdminToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (!isAdminApi) {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// AUTH-02: one silent refresh attempt on user 401s (15-min access token
// expiry). The refresh cookie is httpOnly — JS never sees or touches it.
// Guarded against loops (never refresh the refresh/auth endpoints) and
// only one retry per original request.
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => response.data?.token)
      .finally(() => {
        // Release the shared in-flight promise so the next 401 can retry.
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      });
  }
  return refreshPromise;
};

// Normalize API errors; handle user vs admin session expiry separately
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isUserAuthForm =
      /\/auth\/(login|register|forgot-password|reset-password)/.test(url);
    const isAuthSessionEndpoint = /\/auth\/(refresh|logout)/.test(url);
    const isAdminLogin = /\/admin\/login/.test(url);
    const isAdminApi = url.includes('/admin');
    const isRetry = error.config?._authRetried;

    if (
      status === 401 &&
      !isUserAuthForm &&
      !isAuthSessionEndpoint &&
      !isAdminLogin &&
      !isAdminApi &&
      !isRetry
    ) {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Keep persistent storage in sync so a page reload still works.
          const stored = getToken();
          if (stored) {
            // Preserve whichever storage bucket the old token lived in.
            if (localStorage.getItem('token')) {
              localStorage.setItem('token', newToken);
            } else {
              sessionStorage.setItem('token', newToken);
            }
          }
          error.config._authRetried = true;
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        }
      } catch {
        // Refresh failed — fall through to the session-expired path below.
      }
    }

    if (status === 401 && !isUserAuthForm && !isAdminLogin) {
      if (isAdminApi) {
        clearAdminAuth();
      } else {
        clearAuth();
        sessionStorage.setItem(
          'authMessage',
          'Your session has expired. Please sign in again.'
        );
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    return Promise.reject(toRequestError(error, 'Request failed'));
  }
);

export const authApi = {
  login: async (login, password) => {
    try {
      const response = await api.post('/auth/login', { login, password });
      return response.data;
    } catch (error) {
      throw toRequestError(error, "We couldn't sign you in. Please try again.");
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw toRequestError(error, "We couldn't create your account. Please try again.");
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw toRequestError(error, "We couldn't load your profile. Please try again.");
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw toRequestError(error, "We couldn't update your password. Please try again.");
    }
  },

  deleteAccount: async (password) => {
    try {
      const response = await api.delete('/auth/me', { data: { password } });
      return response.data;
    } catch (error) {
      throw toRequestError(error, "We couldn't delete your account. Please try again.");
    }
  },

  // AUTH-02: silent session restore — exchanges the httpOnly refresh cookie
  // for a fresh 15-min access token. Returns null when no valid session.
  refresh: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      return response.data?.token || null;
    } catch {
      return null;
    }
  },

  // Revoke the refresh cookie server-side (call before clearAuth on logout).
  logout: async () => {
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch {
      // Best-effort — cookie is cleared locally regardless.
    }
  }
};

export default api;
