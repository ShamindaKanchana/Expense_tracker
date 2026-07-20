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

  const [resetRequests, setResetRequests] = useState([]);
  const [resetsLoading, setResetsLoading] = useState(true);
  const [resetActionId, setResetActionId] = useState(null);
  const [lastApprovedCode, setLastApprovedCode] = useState(null);

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

  const loadResets = useCallback(async () => {
    setResetsLoading(true);
    try {
      const response = await api.get('/admin/password-resets');
      setResetRequests(
        Array.isArray(response.data.requests) ? response.data.requests : []
      );
    } catch (err) {
      console.error('Failed to load password resets:', err);
      setResetRequests([]);
    } finally {
      setResetsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAdminToken()) return;
    loadUsers();
    loadResets();
  }, [loadUsers, loadResets]);

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
    setLastApprovedCode(null);
    try {
      const response = await api.delete(`/admin/users/${user.id}`);
      setActionMessage(response.data.message || 'Account deleted.');
      await loadUsers();
      await loadResets();
    } catch (err) {
      setActionMessage(getErrorMessage(err, 'Could not delete that account.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleApproveReset = async (request) => {
    if (
      !window.confirm(
        `Approve password reset for "${request.username}"?\n\nYou will receive a one-time code to share with them.`
      )
    ) {
      return;
    }

    setResetActionId(request.id);
    setActionMessage('');
    setLastApprovedCode(null);
    try {
      const response = await api.post(
        `/admin/password-resets/${request.id}/approve`
      );
      setLastApprovedCode({
        username: response.data.username || request.username,
        code: response.data.code,
        message: response.data.message,
        expiresAt: response.data.expiresAt
      });
      setActionMessage(response.data.message || 'Request approved.');
      await loadResets();
    } catch (err) {
      setActionMessage(getErrorMessage(err, 'Could not approve that request.'));
    } finally {
      setResetActionId(null);
    }
  };

  const handleRejectReset = async (request) => {
    if (!window.confirm(`Reject password reset for "${request.username}"?`)) {
      return;
    }

    setResetActionId(request.id);
    setActionMessage('');
    setLastApprovedCode(null);
    try {
      const response = await api.post(
        `/admin/password-resets/${request.id}/reject`
      );
      setActionMessage(response.data.message || 'Request rejected.');
      await loadResets();
    } catch (err) {
      setActionMessage(getErrorMessage(err, 'Could not reject that request.'));
    } finally {
      setResetActionId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return '—';
    }
  };

  const copyCode = async () => {
    if (!lastApprovedCode?.code) return;
    try {
      await navigator.clipboard.writeText(lastApprovedCode.code);
      setActionMessage('Code copied to clipboard.');
    } catch {
      setActionMessage('Could not copy automatically — select the code manually.');
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

        {lastApprovedCode && (
          <section className="admin-code-box" aria-label="One-time reset code">
            <h2>One-time code (show once)</h2>
            <p className="admin-muted">
              Share with <strong>{lastApprovedCode.username}</strong>. Expires in about 30
              minutes. They use it on the “Set new password” page.
            </p>
            <p className="admin-code-value">{lastApprovedCode.code}</p>
            <button type="button" className="admin-secondary-btn" onClick={copyCode}>
              Copy code
            </button>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => setLastApprovedCode(null)}
            >
              Dismiss
            </button>
          </section>
        )}

        <section
          className="admin-users admin-resets"
          aria-labelledby="admin-resets-heading"
        >
          <h2 id="admin-resets-heading">Password reset requests</h2>
          {resetsLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : resetRequests.length === 0 ? (
            <p className="admin-muted">No pending reset requests.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resetRequests.map((req) => (
                    <tr key={req.id}>
                      <td data-label="Username">{req.username}</td>
                      <td data-label="Requested">{formatDate(req.requested_at)}</td>
                      <td data-label="Actions" className="admin-actions-cell">
                        <button
                          type="button"
                          className="admin-approve-btn"
                          disabled={resetActionId === req.id}
                          onClick={() => handleApproveReset(req)}
                        >
                          {resetActionId === req.id ? '…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="admin-delete-btn"
                          disabled={resetActionId === req.id}
                          onClick={() => handleRejectReset(req)}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
