import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import AuthFormError from './AuthFormError';
import ThemeToggle from './ThemeToggle';
import PasswordInput from './PasswordInput';
import { clearAuth, getUser, setStoredUser } from '../utils/authStorage';
import './Account.css';

const readStoredUser = () => getUser();

const Account = ({ setIsAuthenticated }) => {
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
        // Keep localStorage user as fallback while showing a soft error
        setProfileError(
          getErrorMessage(err, "We couldn't load your profile. Showing saved details.")
        );
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Your new password needs at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match. Type the same password in both boxes.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('Your new password must be different from your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(result.message || 'Password updated successfully.');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setPasswordError(
        getErrorMessage(err, "We couldn't update your password. Please try again.")
      );
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
            <h1>Account</h1>
            <p className="account-subtitle">Your profile and password</p>
          </div>
        </header>

        <section className="account-section" aria-labelledby="account-profile-heading">
          <h2 id="account-profile-heading">Profile</h2>
          {loadingProfile && (
            <p className="account-muted">Loading your details…</p>
          )}
          {profileError && (
            <p className="account-soft-error" role="status">
              {profileError}
            </p>
          )}
          <div className="account-field">
            <span className="account-label">Username</span>
            <span className="account-value" data-testid="account-username">
              {username}
            </span>
            <p className="account-hint">
              Use this username to sign in. Keep it somewhere safe — new accounts do not use email.
            </p>
          </div>
          {email ? (
            <div className="account-field">
              <span className="account-label">Email</span>
              <span className="account-value">{email}</span>
              <p className="account-hint">
                Linked to an older account. You can still sign in with this email or your username.
              </p>
            </div>
          ) : null}
        </section>

        <section className="account-section" aria-labelledby="account-theme-heading">
          <h2 id="account-theme-heading">Appearance</h2>
          <div className="account-theme-row">
            <div>
              <span className="account-label">Theme</span>
              <p className="account-hint" style={{ marginTop: 0 }}>
                Light is the default. Your choice is saved on this device.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="account-section" aria-labelledby="account-password-heading">
          <h2 id="account-password-heading">Change password</h2>
          <form className="account-password-form" onSubmit={handlePasswordSubmit} noValidate>
            <label className="account-input-label" htmlFor="currentPassword">
              Current password
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
              New password
            </label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              minLength={6}
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              className="account-input"
              placeholder="At least 6 characters"
            />

            <label className="account-input-label" htmlFor="confirmPassword">
              Confirm new password
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

            <button
              type="submit"
              className="account-primary-btn"
              disabled={savingPassword}
            >
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="account-section account-section-danger">
          <button type="button" className="account-logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
};

export default Account;
