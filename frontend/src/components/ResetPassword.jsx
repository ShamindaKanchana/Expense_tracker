import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import AuthFormError from './AuthFormError';
import PasswordInput from './PasswordInput';
import './Login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const usernameFromQuery = (searchParams.get('username') || '').trim();
  const [username, setUsername] = useState(usernameFromQuery);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !code.trim() || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Your new password needs at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Type the same password in both boxes.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/reset-password', {
        username: username.trim(),
        code: code.trim(),
        newPassword
      });
      sessionStorage.setItem(
        'authMessage',
        response.data.message || 'Password updated. Please sign in.'
      );
      navigate('/login');
    } catch (err) {
      setError(
        getErrorMessage(err, 'Invalid or expired code. Request a new reset if needed.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Set new password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Use the one-time code from your administrator after they approve your request.
          </p>
        </div>

        <form className="mt-6 auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-fields auth-form-fields-spaced">
            <div>
              <label htmlFor="reset-username" className="sr-only">
                Username
              </label>
              <input
                id="reset-username"
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

            <div>
              <label htmlFor="reset-code" className="sr-only">
                One-time code
              </label>
              <input
                id="reset-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="One-time code (from admin)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="reset-new-password" className="sr-only">
                New password
              </label>
              <PasswordInput
                id="reset-new-password"
                name="newPassword"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="sr-only">
                Confirm new password
              </label>
              <PasswordInput
                id="reset-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form-submit">
            <AuthFormError message={error} />
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm space-y-2">
          <p className="text-gray-600">
            Need to request a code?{' '}
            <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password
            </Link>
          </p>
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

export default ResetPassword;
