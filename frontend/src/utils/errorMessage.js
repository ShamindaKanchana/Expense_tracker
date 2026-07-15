/**
 * Normalize errors from axios, thrown strings, or Error objects into a user-facing message.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const data = error.response?.data;

  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE') || data.includes('<html')) {
      return 'Server returned an unexpected page. Check that the backend is running and REACT_APP_API_URL is correct.';
    }
    return data.trim() || fallback;
  }

  if (data?.message) return data.message;

  if (error.message === 'Network Error') {
    return 'Cannot reach the server. Make sure the backend is running on port 5000.';
  }

  return error.message || fallback;
}