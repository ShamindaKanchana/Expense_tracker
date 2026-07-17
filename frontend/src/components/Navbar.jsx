import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

const Navbar = ({ setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = useMemo(() => readUsername(), [location.pathname]);
  const initial = (username || 'U').charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">Expense Tracker</Link>
      </div>

      <div className="navbar-links">
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

      <div className="navbar-actions">
        <Link
          to="/account"
          className={`nav-account ${isActive('/account')}`}
          title={username ? `Account (${username})` : 'Account'}
          aria-label={username ? `Account, signed in as ${username}` : 'Account'}
        >
          <span className="nav-account-avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="nav-account-text">
            <span className="nav-account-label">Account</span>
            {username ? (
              <span className="nav-account-name">{username}</span>
            ) : null}
          </span>
        </Link>
        <button type="button" onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
