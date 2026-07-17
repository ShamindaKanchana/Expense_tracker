import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const readUsername = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return user?.username || '';
  } catch {
    return '';
  }
};

/** Compact icons for mobile bottom bar (no extra icon library). */
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

const BOTTOM_TABS = [
  { to: '/dashboard', label: 'Home', Icon: IconHome },
  { to: '/add-expense', label: 'Add', Icon: IconAdd },
  { to: '/monthly-expenses', label: 'Report', Icon: IconReport },
  { to: '/account', label: 'Account', Icon: IconAccount }
];

const Navbar = ({ setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => readUsername());

  useEffect(() => {
    setUsername(readUsername());
  }, [location.pathname]);

  const initial = (username || 'U').charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const isActive = (path) => (location.pathname === path ? 'active' : '');

  return (
    <>
      {/* Top bar: compact on mobile (title only); full nav on desktop */}
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/dashboard">Expense Tracker</Link>
        </div>

        <div className="navbar-links navbar-links-desktop">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
            Dashboard
          </Link>
          <Link to="/add-expense" className={`nav-link ${isActive('/add-expense')}`}>
            Add Expense
          </Link>
          <Link to="/monthly-expenses" className={`nav-link ${isActive('/monthly-expenses')}`}>
            Monthly Report
          </Link>
        </div>

        {/* Single theme toggle for all viewports (avoid duplicate desktop controls) */}
        <div className="navbar-actions">
          <ThemeToggle className="theme-toggle--nav" />
          <Link
            to="/account"
            className={`nav-account nav-desktop-only ${isActive('/account')}`}
            title={username ? `Account (${username})` : 'Account'}
            aria-label={username ? `Account, signed in as ${username}` : 'Account'}
          >
            <span className="nav-account-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="nav-account-text">
              <span className="nav-account-label">Account</span>
              {username ? <span className="nav-account-name">{username}</span> : null}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="logout-button nav-desktop-only"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Mobile: thumb-friendly bottom tabs (primary destinations) */}
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {BOTTOM_TABS.map(({ to, label, Icon }) => (
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
