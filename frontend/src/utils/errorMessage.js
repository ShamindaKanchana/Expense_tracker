const FRIENDLY_MESSAGES = {
  'Invalid credentials': 'Incorrect email or password. Please check and try again.',
  'Email and password are required': 'Please enter your email and password.',
  'All fields are required': 'Please fill in your username, email, and password.',
  'An account with this email already exists': 'This email is already registered. Try signing in instead.',
  'This username is already taken': 'That username is taken. Please choose a different one.',
  'User already exists': 'This email is already registered. Try signing in instead.',
  'Server error during registration': "We couldn't create your account right now. Please try again in a moment.",
  'Server error during login': "We couldn't sign you in right now. Please try again in a moment.",
  'Server error': 'Something went wrong on our side. Please try again in a moment.',
  'Registration failed': "We couldn't create your account. Please try again.",
  'Login failed': "We couldn't sign you in. Please try again.",
  'Request failed': 'Something went wrong. Please try again.',
};

const toFriendlyMessage = (message) => {
  if (!message) return message;
  const trimmed = message.trim();
  return FRIENDLY_MESSAGES[trimmed] || trimmed;
};

/**
 * Normalize errors from axios, thrown strings, or Error objects into a user-facing message.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return toFriendlyMessage(error);

  const data = error.response?.data;

  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE') || data.includes('<html')) {
      return 'Something went wrong connecting to the server. Please try again later.';
    }
    return toFriendlyMessage(data) || fallback;
  }

  if (data?.message) return toFriendlyMessage(data.message);

  if (error.message === 'Network Error') {
    return "We can't reach the server right now. Please check your connection and try again.";
  }

  return toFriendlyMessage(error.message) || fallback;
}