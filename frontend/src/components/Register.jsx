import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import AuthFormError from './AuthFormError';
import AuthHelp from './AuthHelp';
import './Login.css';

const USERNAME_TIP =
  'Choose a username you will remember — you will need it to sign in after creating your account. No email is required.';

const Register = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUsernameTip, setShowUsernameTip] = useState(false);
  const usernameFieldRef = useRef(null);
  const navigate = useNavigate();

  // Close username tip when clicking outside or pressing Escape
  useEffect(() => {
    if (!showUsernameTip) return undefined;

    const onPointerDown = (e) => {
      if (usernameFieldRef.current && !usernameFieldRef.current.contains(e.target)) {
        setShowUsernameTip(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setShowUsernameTip(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showUsernameTip]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const username = formData.username.trim();

    if (!username || !formData.password || !formData.confirmPassword) {
      setError('Please choose a username and password.');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Your passwords don't match. Type the same password in both boxes.");
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Your password needs at least 6 characters.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // New accounts: username + password only (no email required)
      const response = await authApi.register({
        username,
        password: formData.password
      });
      
      // Save token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update auth state and redirect
      setIsAuthenticated(true);
      navigate('/dashboard');
      
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't create your account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <AuthHelp />
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Expense Tracker
          </h2>
          <p className="mt-2 text-sm text-gray-600">Create your account with a username and password</p>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-fields rounded-md shadow-sm -space-y-px">
            <div className="auth-field-with-tip" ref={usernameFieldRef}>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-9 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username (min 3 characters)"
                value={formData.username}
                onChange={handleChange}
                aria-describedby={showUsernameTip ? 'username-tip' : undefined}
              />
              <button
                type="button"
                className="auth-field-info-btn"
                onClick={() => setShowUsernameTip((open) => !open)}
                aria-label="Why remember your username"
                aria-expanded={showUsernameTip}
                aria-controls="username-tip"
                title="Username tip"
              >
                <svg
                  className="auth-field-info-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
                  <path
                    d="M8 7.25V11"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="5.25" r="0.75" fill="currentColor" />
                </svg>
              </button>
              {showUsernameTip && (
                <p id="username-tip" className="auth-field-tip" role="tooltip">
                  {USERNAME_TIP}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="auth-form-submit">
            <AuthFormError message={error} />
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="auth-form-footer text-sm text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
