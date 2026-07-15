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

// Normalize API errors so UI always gets an Error with a readable message (never raw HTML pages)
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toRequestError(error, 'Request failed'))
);

// Auth API
export const authApi = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
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
  }
};

export default api;
