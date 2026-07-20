import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import { setAuth } from '../utils/authStorage';
import AuthFormError from './AuthFormError';
import AuthHelp from './AuthHelp';
import PasswordInput from './PasswordInput';
import './Login.css';

const Login = ({ setIsAuthenticated }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showRememberTip, setShowRememberTip] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const rememberTipRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const authMessage = sessionStorage.getItem('authMessage');
    if (authMessage) {
      setError(authMessage);
      sessionStorage.removeItem('authMessage');
    }
  }, []);

  useEffect(() => {
    if (!showRememberTip) return undefined;
    const onPointerDown = (e) => {
      if (rememberTipRef.current && !rememberTipRef.current.contains(e.target)) {
        setShowRememberTip(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setShowRememberTip(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showRememberTip]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.login || !formData.password) {
      setError(t('login.fillRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { token, user } = await authApi.login(formData.login.trim(), formData.password);

      setAuth(token, user, rememberMe);

      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, t('login.failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
        <AuthHelp />
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">{t('login.title')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('login.subtitle')}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="login" className="sr-only">
                {t('login.loginPlaceholder')}
              </label>
              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={t('login.loginPlaceholder')}
                value={formData.login}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('common.password')}
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder={t('login.passwordPlaceholder')}
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <AuthFormError message={error} />

          <div className="login-form-extras">
            <div className="remember-me-row" ref={rememberTipRef}>
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me">{t('login.rememberMe')}</label>
              <button
                type="button"
                className="remember-me-info-btn"
                onClick={() => setShowRememberTip((open) => !open)}
                aria-label={t('login.rememberAria')}
                aria-expanded={showRememberTip}
                aria-controls="remember-me-tip"
                title={t('login.rememberAria')}
              >
                <svg
                  className="remember-me-info-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M8 7.25V11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  <circle cx="8" cy="5.25" r="0.75" fill="currentColor" />
                </svg>
              </button>
              {showRememberTip && (
                <p id="remember-me-tip" className="remember-me-tip" role="tooltip">
                  {t('login.rememberTip')}
                </p>
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm">
                <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                  {t('login.forgotPassword')}
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                {t('login.noAccount')}{' '}
                <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                  {t('login.signUp')}
                </Link>
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.signIn')
              )}
            </button>
          </div>
        </form>

        <footer className="login-credit">
          <p>{t('login.credit', { year: new Date().getFullYear() })}</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
