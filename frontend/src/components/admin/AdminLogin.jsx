import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorMessage';
import { getAdminToken, setAdminAuth } from '../../utils/adminStorage';
import PasswordInput from '../PasswordInput';
import AuthFormError from '../AuthFormError';
import './Admin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getAdminToken()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter admin username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/admin/login', {
        username: username.trim(),
        password
      });
      const { token, admin } = response.data;
      setAdminAuth(token, admin);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't sign you in."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card admin-card-narrow">
        <header className="admin-header">
          <p className="admin-badge">Admin</p>
          <h1>Expense Tracker</h1>
          <p className="admin-subtitle">Sign in to the administration panel</p>
        </header>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-label" htmlFor="admin-username">
            Username
          </label>
          <input
            id="admin-username"
            name="username"
            type="text"
            autoComplete="username"
            className="admin-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label className="admin-label" htmlFor="admin-password">
            Password
          </label>
          <PasswordInput
            id="admin-password"
            name="password"
            autoComplete="current-password"
            className="admin-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <AuthFormError message={error} />

          <button type="submit" className="admin-primary-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
