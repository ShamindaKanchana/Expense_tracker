import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ setIsAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
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
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
