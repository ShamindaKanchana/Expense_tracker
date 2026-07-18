import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorMessage';
import {
  clearAdminAuth,
  getAdminToken,
  getAdminUser
} from '../../utils/adminStorage';
import './Admin.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const adminUser = getAdminUser();
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/users');
      setTotal(response.data.total ?? 0);
      setUsers(Array.isArray(response.data.users) ? response.data.users : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users.'));
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAdminToken()) return;
    loadUsers();
  }, [loadUsers]);

  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    clearAdminAuth();
    navigate('/admin/login', { replace: true });
  };

  const handleDelete = async (user) => {
    const confirmName = window.prompt(
      `Delete account "${user.username}" and all of their expenses?\n\nType the username to confirm:`
    );
    if (confirmName === null) return;
    if (confirmName.trim() !== user.username) {
      setActionMessage('Delete cancelled — username did not match.');
      return;
    }

    setDeletingId(user.id);
    setActionMessage('');
    try {
      const response = await api.delete(`/admin/users/${user.id}`);
      setActionMessage(response.data.message || 'Account deleted.');
      await loadUsers();
    } catch (err) {
      setActionMessage(getErrorMessage(err, 'Could not delete that account.'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-card admin-card-wide">
        <header className="admin-dashboard-header">
          <div>
            <p className="admin-badge">Admin</p>
            <h1>Expense Tracker</h1>
            <p className="admin-subtitle">
              Signed in as {adminUser?.username || 'admin'}
            </p>
          </div>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <section className="admin-summary" aria-label="Account summary">
          <p className="admin-summary-label">Total accounts</p>
          <p className="admin-summary-value">{loading ? '…' : total}</p>
        </section>

        {actionMessage && (
          <p className="admin-action-msg" role="status">
            {actionMessage}
          </p>
        )}
        {error && (
          <p className="admin-error-msg" role="alert">
            {error}
          </p>
        )}

        <section className="admin-users" aria-labelledby="admin-users-heading">
          <h2 id="admin-users-heading">Users</h2>
          {loading ? (
            <p className="admin-muted">Loading…</p>
          ) : users.length === 0 ? (
            <p className="admin-muted">No user accounts yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Expenses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td data-label="Username">{user.username}</td>
                      <td data-label="Email">{user.email || '—'}</td>
                      <td data-label="Joined">{formatDate(user.created_at)}</td>
                      <td data-label="Expenses">{user.expense_count ?? 0}</td>
                      <td data-label="Actions">
                        <button
                          type="button"
                          className="admin-delete-btn"
                          disabled={deletingId === user.id}
                          onClick={() => handleDelete(user)}
                        >
                          {deletingId === user.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
