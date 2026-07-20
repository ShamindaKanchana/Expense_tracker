import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import AuthFormError from './AuthFormError';
import LanguageSwitcher from './LanguageSwitcher';
import './Login.css';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submittedUsername, setSubmittedUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError(t('forgot.enterUsername'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', {
        username: trimmed
      });
      setSubmittedUsername(trimmed);
    } catch (err) {
      setError(getErrorMessage(err, t('forgot.failed')));
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
        <div className="flex justify-end">
          <LanguageSwitcher variant="compact" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {submittedUsername ? t('forgot.submittedTitle') : t('forgot.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {submittedUsername ? t('forgot.submittedSubtitle') : t('forgot.subtitle')}
          </p>
        </div>

        {submittedUsername ? (
          <div className="auth-form" role="status">
            <div className="auth-request-success">
              <p className="auth-request-success-title">{t('forgot.successTitle')}</p>
              <ol className="auth-request-next-steps">
                <li>{t('forgot.step1')}</li>
                <li>{t('forgot.step2')}</li>
                <li>{t('forgot.step3')}</li>
              </ol>
            </div>

            <div className="auth-form-submit">
              <Link
                to={resetPath}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-center no-underline"
              >
                {t('forgot.haveCode')}
              </Link>
              <button
                type="button"
                onClick={handleRequestAgain}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {t('forgot.differentUser')}
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-6 auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-fields">
              <label htmlFor="forgot-username" className="sr-only">
                {t('common.username')}
              </label>
              <input
                id="forgot-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={t('common.username')}
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
                {loading ? t('forgot.submitting') : t('forgot.submit')}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm space-y-2">
          {!submittedUsername && (
            <p className="text-gray-600">
              {t('forgot.alreadyHaveCode')}{' '}
              <Link to="/reset-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                {t('forgot.setNewPassword')}
              </Link>
            </p>
          )}
          <p className="text-gray-600">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              {t('common.backToSignIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
