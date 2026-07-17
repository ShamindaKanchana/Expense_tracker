import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getErrorMessage } from '../utils/errorMessage';

const API_URL = API_BASE_URL;

const toRequestError = (error, fallback) => {
  const message = getErrorMessage(error, fallback);
  return new Error(message);
};

if (process.env.NODE_ENV === 'development') {
  console.log(`API base URL: ${API_URL}`);
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Normalize API errors; on expired/invalid JWT, force sign-in instead of broken empty pages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // Login/register 401 means wrong credentials — do not treat as session expiry
    const isAuthForm = /\/auth\/(login|register)/.test(url);

    if (status === 401 && !isAuthForm) {
      clearSession();
      sessionStorage.setItem(
        'authMessage',
        'Your session has expired. Please sign in again.'
      );
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }

    return Promise.reject(toRequestError(error, 'Request failed'));
  }
);

// Auth API
export const authApi = {
  // login accepts username or email (single identifier field)
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
