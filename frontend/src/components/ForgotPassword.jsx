import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import AuthFormError from './AuthFormError';
import './Login.css';

const ForgotPassword = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submittedUsername, setSubmittedUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter your username.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', {
        username: trimmed
      });
      // Always show the same next-step UI (no account enumeration).
      setSubmittedUsername(trimmed);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAgain = () => {
    setSubmittedUsername('');
    setError('');
    setUsername('');
  };

  const resetPath = submittedUsername
    ? `/reset-password?username=${encodeURIComponent(submittedUsername)}`
    : '/reset-password';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {submittedUsername ? 'Request submitted' : 'Forgot password'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {submittedUsername
              ? 'What happens next is below. You will not get a code until an administrator approves your request.'
              : 'Enter your username. An administrator will review your request and share a one-time code if approved.'}
          </p>
        </div>

        {submittedUsername ? (
          <div className="auth-form" role="status">
            <div className="auth-request-success">
              <p className="auth-request-success-title">
                If this account exists, a reset request was sent to the administrator.
              </p>
              <ol className="auth-request-next-steps">
                <li>Wait for the administrator to approve your request.</li>
                <li>They will share a one-time code with you (message, call, etc.).</li>
                <li>Enter that code with a new password on the next screen.</li>
              </ol>
            </div>

            <div className="auth-form-submit">
              <Link
                to={resetPath}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-center no-underline"
              >
                I have my code — set new password
              </Link>
              <button
                type="button"
                onClick={handleRequestAgain}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit a different username
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-fields">
              <label htmlFor="forgot-username" className="sr-only">
                Username
              </label>
              <input
                id="forgot-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="auth-form-submit">
              <AuthFormError message={error} />
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm space-y-2">
          {!submittedUsername && (
            <p className="text-gray-600">
              Already have a code?{' '}
              <Link to="/reset-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Set a new password
              </Link>
            </p>
          )}
          <p className="text-gray-600">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
