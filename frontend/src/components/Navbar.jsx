import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { clearAuth, getUser } from '../utils/authStorage';
import './Navbar.css';

const readUsername = () => {
  const user = getUser();
  return user?.username || '';
};

const IconHome = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
  </svg>
);

const IconAdd = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
  </svg>
);

const IconReport = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M5 19V10M10 19V5M15 19v-7M20 19V8" strokeLinecap="round" />
  </svg>
);

const IconAccount = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="12" cy="9" r="3.25" />
    <path d="M6.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round" />
  </svg>
);

const Navbar = ({ setIsAuthenticated }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => readUsername());

  useEffect(() => {
    setUsername(readUsername());
  }, [location.pathname]);

  const initial = (username || 'U').charAt(0).toUpperCase();

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    navigate('/login');
  };

  const isActive = (path) => (location.pathname === path ? 'active' : '');

  const bottomTabs = [
    { to: '/dashboard', label: t('nav.home'), Icon: IconHome },
    { to: '/add-expense', label: t('nav.add'), Icon: IconAdd },
    { to: '/monthly-expenses', label: t('nav.report'), Icon: IconReport },
    { to: '/account', label: t('nav.account'), Icon: IconAccount }
  ];

  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/dashboard">{t('app.name')}</Link>
        </div>

        <div className="navbar-links navbar-links-desktop">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
            {t('nav.dashboard')}
          </Link>
          <Link to="/add-expense" className={`nav-link ${isActive('/add-expense')}`}>
            {t('nav.addExpense')}
          </Link>
          <Link to="/monthly-expenses" className={`nav-link ${isActive('/monthly-expenses')}`}>
            {t('nav.monthlyReport')}
          </Link>
        </div>

        <div className="navbar-actions">
          <LanguageSwitcher variant="compact" />
          <ThemeToggle className="theme-toggle--nav" />
          <Link
            to="/account"
            className={`nav-account nav-desktop-only ${isActive('/account')}`}
            title={username ? `${t('nav.account')} (${username})` : t('nav.account')}
            aria-label={
              username ? t('nav.accountAs', { username }) : t('nav.account')
            }
          >
            <span className="nav-account-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="nav-account-text">
              <span className="nav-account-label">{t('nav.account')}</span>
              {username ? <span className="nav-account-name">{username}</span> : null}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="logout-button nav-desktop-only"
          >
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label={t('nav.dashboard')}>
        {bottomTabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive: active }) =>
              `mobile-bottom-nav-item${active ? ' active' : ''}`
            }
          >
            <span className="mobile-bottom-nav-icon">
              <Icon />
            </span>
            <span className="mobile-bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Navbar;
