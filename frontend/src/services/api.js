import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getErrorMessage } from '../utils/errorMessage';
import { clearAuth, getToken } from '../utils/authStorage';
import { clearAdminAuth, getAdminToken } from '../utils/adminStorage';

const API_URL = API_BASE_URL;

const toRequestError = (error, fallback) => {
  const message = getErrorMessage(error, fallback);
  return new Error(message);
};

if (process.env.NODE_ENV === 'development') {
  console.log(`API base URL: ${API_URL}`);
}

const api = axios.create({
  baseURL: API_URL,
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

// Normalize API errors; handle user vs admin session expiry separately
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isUserAuthForm =
      /\/auth\/(login|register|forgot-password|reset-password)/.test(url);
    const isAdminLogin = /\/admin\/login/.test(url);
    const isAdminApi = url.includes('/admin');

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
  }
};

export default api;
