import i18n from '../i18n';

const ERROR_KEYS = [
  'Invalid credentials',
  'Email and password are required',
  'All fields are required',
  'An account with this email already exists',
  'This username is already taken',
  'User already exists',
  'Server error during registration',
  'Server error during login',
  'Server error',
  'Registration failed',
  'Login failed',
  'Request failed'
];

const toFriendlyMessage = (message) => {
  if (!message) return message;
  const trimmed = message.trim();
  if (ERROR_KEYS.includes(trimmed) && i18n.exists(`errors.${trimmed}`)) {
    return i18n.t(`errors.${trimmed}`);
  }
  return trimmed;
};

/**
 * Normalize errors from axios, thrown strings, or Error objects into a user-facing message.
 */
export function getErrorMessage(error, fallback) {
  const defaultFallback = fallback || i18n.t('errors.generic');
  if (!error) return defaultFallback;
  if (typeof error === 'string') return toFriendlyMessage(error);

  const data = error.response?.data;

  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE') || data.includes('<html')) {
      return i18n.t('errors.htmlResponse');
    }
    return toFriendlyMessage(data) || defaultFallback;
  }

  if (data?.message) return toFriendlyMessage(data.message);

  if (error.message === 'Network Error') {
    return i18n.t('errors.Network Error');
  }

  return toFriendlyMessage(error.message) || defaultFallback;
}
