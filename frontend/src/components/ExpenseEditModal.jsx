import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { CATEGORY_KEYS } from '../utils/categories';
import { getErrorMessage } from '../utils/errorMessage';
import './ExpenseEditModal.css';

const pad = (value) => String(value).padStart(2, '0');

const toLocalISODate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const todayISO = () => toLocalISODate(new Date());

const toInputDate = (value) => {
  // Plain calendar dates have no timezone; keep them verbatim.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return todayISO();
  return toLocalISODate(parsed);
};

const buildForm = (expense) => ({
  amount: expense?.amount != null ? String(expense.amount) : '',
  description: expense?.description || '',
  category: expense?.category || '',
  date: toInputDate(expense?.date)
});

const ExpenseEditModal = ({ expense, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => buildForm(expense));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);
  const today = todayISO();

  useEffect(() => {
    setForm(buildForm(expense));
    setErrors({});
    setError('');
    setSaving(false);
    const focusTimer = setTimeout(() => amountRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [expense]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, saving]);

  if (!expense) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const amount = Number(form.amount);

    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = t('expenseActions.invalidAmount');
    }
    if (!form.category) {
      nextErrors.category = t('expenseActions.selectCategory');
    }
    if (!form.description.trim()) {
      nextErrors.description = t('expenseActions.enterDescription');
    }
    if (!form.date || form.date > today) {
      nextErrors.date = t('expenseActions.enterDate');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError('');
    try {
      const response = await api.put(`/expenses/${expense.id}`, {
        amount: Number(form.amount),
        description: form.description.trim(),
        category: form.category,
        date: form.date
      });
      onSaved(response.data);
    } catch (err) {
      if (err.code === 'EXPENSE_EDIT_WINDOW_EXPIRED') {
        setError(t('expenseActions.editExpired'));
      } else if (err.status === 404) {
        setError(t('expenseActions.notFound'));
      } else {
        setError(getErrorMessage(err, t('expenseActions.editFailed')));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="expense-edit-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="expense-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-edit-title"
      >
        <div className="expense-edit-header">
          <h3 id="expense-edit-title">{t('expenseActions.editTitle')}</h3>
          <button
            type="button"
            className="expense-edit-close"
            onClick={onClose}
            disabled={saving}
            aria-label={t('common.close')}
          >
            &times;
          </button>
        </div>
        <p className="expense-edit-subtitle">{t('expenseActions.editSubtitle')}</p>
        <p className="expense-edit-hint">{t('expenseActions.editWindowHint')}</p>

        {error && (
          <div className="expense-edit-alert" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-edit-form">
          <div className="expense-edit-group">
            <label htmlFor="edit-expense-amount">{t('common.amount')}</label>
            <input
              ref={amountRef}
              id="edit-expense-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={handleChange}
              className={errors.amount ? 'error-input' : ''}
              placeholder="0.00"
            />
            {errors.amount && <span className="error-text">{errors.amount}</span>}
          </div>

          <div className="expense-edit-group">
            <label htmlFor="edit-expense-category">{t('common.category')}</label>
            <select
              id="edit-expense-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className={errors.category ? 'error-input' : ''}
            >
              <option value="">{t('common.selectCategory')}</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`categories.${key}`)}
                </option>
              ))}
            </select>
            {errors.category && <span className="error-text">{errors.category}</span>}
          </div>

          <div className="expense-edit-group">
            <label htmlFor="edit-expense-description">{t('common.description')}</label>
            <input
              id="edit-expense-description"
              name="description"
              type="text"
              value={form.description}
              onChange={handleChange}
              className={errors.description ? 'error-input' : ''}
              placeholder={t('addExpense.descriptionPlaceholder')}
            />
            {errors.description && (
              <span className="error-text">{errors.description}</span>
            )}
          </div>

          <div className="expense-edit-group">
            <label htmlFor="edit-expense-date">{t('common.date')}</label>
            <input
              id="edit-expense-date"
              name="date"
              type="date"
              value={form.date}
              max={today}
              onChange={handleChange}
              className={errors.date ? 'error-input' : ''}
            />
            {errors.date && <span className="error-text">{errors.date}</span>}
          </div>

          <div className="expense-edit-actions">
            <button
              type="button"
              className="expense-edit-cancel"
              onClick={onClose}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="expense-edit-save" disabled={saving}>
              {saving ? t('expenseActions.saving') : t('expenseActions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseEditModal;
