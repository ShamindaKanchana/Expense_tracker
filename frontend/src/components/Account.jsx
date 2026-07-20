import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import AuthFormError from './AuthFormError';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import PasswordInput from './PasswordInput';
import { clearAuth, getUser, setStoredUser } from '../utils/authStorage';
import './Account.css';

const readStoredUser = () => getUser();

const Account = ({ setIsAuthenticated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(readStoredUser);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError('');
      try {
        const data = await authApi.getMe();
        if (cancelled) return;
        setProfile(data);
        setStoredUser({
          id: data.id,
          username: data.username,
          email: data.email || null
        });
      } catch (err) {
        if (cancelled) return;
        setProfileError(getErrorMessage(err, t('account.profileFailed')));
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handlePasswordChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const { currentPassword, newPassword, confirmPassword } = passwords;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('account.fillPasswords'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('account.passwordMin'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.passwordMismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(t('account.passwordSame'));
      return;
    }

    setSavingPassword(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(result.message || t('account.passwordUpdated'));
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setPasswordError(getErrorMessage(err, t('account.passwordFailed')));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    navigate('/login');
  };

  const username = profile?.username || '—';
  const email = profile?.email;
  const initial = (profile?.username || '?').charAt(0).toUpperCase();

  return (
    <div className="account-page">
      <div className="account-card">
        <header className="account-header">
          <div className="account-avatar" aria-hidden="true">
            {initial}
          </div>
          <div>
            <h1>{t('account.title')}</h1>
            <p className="account-subtitle">{t('account.subtitle')}</p>
          </div>
        </header>

        <section className="account-section" aria-labelledby="account-profile-heading">
          <h2 id="account-profile-heading">{t('account.profile')}</h2>
          {loadingProfile && <p className="account-muted">{t('account.loadingDetails')}</p>}
          {profileError && (
            <p className="account-soft-error" role="status">
              {profileError}
            </p>
          )}
          <div className="account-field">
            <span className="account-label">{t('common.username')}</span>
            <span className="account-value" data-testid="account-username">
              {username}
            </span>
            <p className="account-hint">{t('account.usernameHint')}</p>
          </div>
          {email ? (
            <div className="account-field">
              <span className="account-label">{t('common.email')}</span>
              <span className="account-value">{email}</span>
              <p className="account-hint">{t('account.emailHint')}</p>
            </div>
          ) : null}
        </section>

        <section className="account-section" aria-labelledby="account-language-heading">
          <h2 id="account-language-heading">{t('language.label')}</h2>
          <div className="account-theme-row">
            <div>
              <span className="account-label">{t('language.label')}</span>
              <p className="account-hint" style={{ marginTop: 0 }}>
                EN · සිංහල · தமிழ்
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </section>

        <section className="account-section" aria-labelledby="account-theme-heading">
          <h2 id="account-theme-heading">{t('account.appearance')}</h2>
          <div className="account-theme-row">
            <div>
              <span className="account-label">{t('account.theme')}</span>
              <p className="account-hint" style={{ marginTop: 0 }}>
                {t('account.themeHint')}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="account-section" aria-labelledby="account-password-heading">
          <h2 id="account-password-heading">{t('account.changePassword')}</h2>
          <form className="account-password-form" onSubmit={handlePasswordSubmit} noValidate>
            <label className="account-input-label" htmlFor="currentPassword">
              {t('account.currentPassword')}
            </label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={handlePasswordChange}
              className="account-input"
            />

            <label className="account-input-label" htmlFor="newPassword">
              {t('account.newPassword')}
            </label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              minLength={6}
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              className="account-input"
              placeholder={t('account.passwordMinPlaceholder')}
            />

            <label className="account-input-label" htmlFor="confirmPassword">
              {t('account.confirmNewPassword')}
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              className="account-input"
            />

            <AuthFormError message={passwordError} />
            {passwordSuccess && (
              <p className="account-success" role="status">
                {passwordSuccess}
              </p>
            )}

            <button type="submit" className="account-primary-btn" disabled={savingPassword}>
              {savingPassword ? t('account.updating') : t('account.updatePassword')}
            </button>
          </form>
        </section>

        <section className="account-section account-section-danger">
          <button type="button" className="account-logout-btn" onClick={handleLogout}>
            {t('account.signOut')}
          </button>
        </section>
      </div>
    </div>
  );
};

export default Account;
