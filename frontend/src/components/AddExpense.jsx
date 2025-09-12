import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddExpense.css';

const AddExpense = () => {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Food' },
    { id: 2, name: 'Transport' },
    { id: 3, name: 'Entertainment' },
    { id: 4, name: 'Bills' },
    { id: 5, name: 'Shopping' },
    { id: 6, name: 'Others' },
  ]);
  
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

  // Fetch categories from the API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/expenses/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedData = {
        ...prev,
        [name]: value
      };
      console.log('Form data updated:', updatedData);
      return updatedData;
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!formData.date) {
      newErrors.date = 'Please select a date';
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
      console.log('Submitting form with data:', formData);
      
      // Ensure category has proper case (first letter uppercase, rest lowercase)
      const formatCategory = (cat) => {
        if (!cat) return '';
        return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
      };
      
      const requestBody = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formatCategory(formData.category),
        date: formData.date
      };
      
      console.log('Sending request to backend:', requestBody);
      
      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${userToken}` // Uncomment when auth is implemented
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: categories.find(cat => cat.id.toString() === formData.category)?.name || formData.category,
          date: formData.date
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save expense');
      }

      const savedExpense = await response.json();
      
      // Show success message
      setSubmitStatus({
        success: true,
        message: 'Expense added successfully!',
        expense: {
          ...savedExpense,
          date: new Date(formData.date).toISOString()
        }
      });
      
      // Reset form
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Optionally redirect to dashboard after a delay
      // setTimeout(() => navigate('/dashboard'), 1500);
      
    } catch (error) {
      console.error('Error adding expense:', error);
      let errorMessage = 'Failed to add expense. Please try again.';
      
      // Check if the error is due to HTML response (like a 404 page)
      if (error.message.includes('Unexpected token') && error.message.includes('<!DOCTYPE')) {
        errorMessage = 'Server returned an HTML error page. Please check if the backend server is running and accessible at http://localhost:5000';
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
        <h2>Add New Expense</h2>
        
        {submitStatus.message && (
          <div className={`status-message ${submitStatus.success ? 'success' : 'error'}`}>
            {submitStatus.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Amount ($)</label>
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
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? 'error-input' : ''}
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && <span className="error-text">{errors.category}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Grocery shopping"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Date</label>
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
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
