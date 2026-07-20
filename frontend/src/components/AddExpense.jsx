import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { CATEGORY_KEYS } from '../utils/categories';
import './AddExpense.css';

const AddExpense = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ success: false, message: '' });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('addExpense.invalidAmount');
    }

    if (!formData.category) {
      newErrors.category = t('addExpense.selectCategory');
    }

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = t('addExpense.enterDescription');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ success: false, message: '' });

    try {
      // Store English ENUM value in DB; UI labels are translated.
      const response = await api.post('/expenses', {
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        date: formData.date
      });

      const savedExpense = response.data;

      setSubmitStatus({
        success: true,
        message: t('addExpense.success'),
        expense: {
          ...savedExpense,
          date: new Date(formData.date).toISOString()
        }
      });

      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      let errorMessage = t('addExpense.failed');

      if (error.message?.includes('Unexpected token') && error.message?.includes('<!DOCTYPE')) {
        errorMessage = t('addExpense.serverHtml');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSubmitStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-expense-container">
      <div className="add-expense-card">
        <h2>{t('addExpense.title')}</h2>

        {submitStatus.message && (
          <div className={`status-message ${submitStatus.success ? 'success' : 'error'}`}>
            {submitStatus.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">{t('common.amount')}</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              className={errors.amount ? 'error-input' : ''}
              placeholder="0.00"
            />
            {errors.amount && <span className="error-text">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">{t('common.category')}</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? 'error-input' : ''}
              required
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

          <div className="form-group">
            <label htmlFor="description">{t('common.description')}</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('addExpense.descriptionPlaceholder')}
              className={errors.description ? 'error-input' : ''}
              required
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="date">{t('common.date')}</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={errors.date ? 'error-input' : ''}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.date && <span className="error-text">{errors.date}</span>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate('/dashboard')}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? t('addExpense.adding') : t('addExpense.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
