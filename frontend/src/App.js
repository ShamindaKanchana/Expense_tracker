import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddExpense from './components/AddExpense';
import MonthlyExpenses from './components/MonthlyExpenses';
import Account from './components/Account';
import Navbar from './components/Navbar';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { getToken, setAuth, getUser } from './utils/authStorage';
import { authApi } from './services/api';
import './App.css';

function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (getToken()) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // AUTH-02: no access token (15-min expiry or new tab) — try the
      // httpOnly refresh cookie for a silent restore before showing login.
      const token = await authApi.refresh();
      if (token) {
        const user = getUser();
        // Preserve the previous remember-me bucket (default localStorage).
        setAuth(token, user, true);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  if (loading) {
    return <div className="loading">{t('app.loading')}</div>;
  }

  // Admin area: no user navbar, no link from user app
  if (isAdminPath) {
    return (
      <div className="App">
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} />}
      <main className="main-content">
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/register"
            element={
              !isAuthenticated ? (
                <Register setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              !isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="/reset-password"
            element={
              !isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/add-expense"
            element={isAuthenticated ? <AddExpense /> : <Navigate to="/login" />}
          />
          <Route
            path="/monthly-expenses"
            element={
              isAuthenticated ? <MonthlyExpenses /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/account"
            element={
              isAuthenticated ? (
                <Account setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
