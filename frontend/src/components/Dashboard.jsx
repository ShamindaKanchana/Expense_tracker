import React, { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const Dashboard = () => {
  // State for storing data from backend
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [error, setError] = useState(null);
  const [maxMonth, setMaxMonth] = useState({ month: '', year: '', total: 0 });
  // Use useRef to maintain maxCategory between re-renders
  const maxCategoryRef = useRef({ category: '', total: 0 });
  const [maxCategory, setMaxCategory] = useState({ category: '', total: 0 });

  // Debug effect to log maxCategory changes with stack trace
  useEffect(() => {
    const stack = new Error().stack;
    console.group('maxCategory state updated');
    try {
      console.log('New maxCategory:', JSON.parse(JSON.stringify(maxCategory)));
    } catch (e) {
      console.error('Error stringifying maxCategory:', e);
      console.log('Raw maxCategory:', maxCategory);
    }
    console.log('Update triggered from:', stack.split('\n')[2]?.trim());
    console.groupEnd();
  }, [maxCategory]);

  // Fetch category data for top category and donut chart
  useEffect(() => {
    let isMounted = true;
    
    const fetchCategoryData = async () => {
      console.group('=== Starting Category Data Fetch ===');
      try {
        const token = localStorage.getItem('token');
        console.log('🔑 Using token for categories fetch:', token ? 'Token exists' : 'No token');
        
        const response = await fetch('http://localhost:5000/api/expenses/categories', {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include',
          cache: 'no-store' // Prevent caching
        });

        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch category data: ${response.status} ${errorText}`);
        }

        const categories = await response.json();
        console.log('📊 Received categories from API:', categories);
        
        if (isMounted && categories && Array.isArray(categories) && categories.length > 0) {
          console.log('🔄 Processing categories, count:', categories.length);
          
          // Log all categories for debugging
          categories.forEach((cat, i) => {
            console.log(`  ${i + 1}. ${cat.name || cat.category}: $${cat.total}`);
          });
          
          // Set the top category (first item in the array since it's ordered by total DESC)
          const topCategory = categories[0];
          // Ensure we have valid values before updating state
          const categoryName = String(topCategory.name || topCategory.category || 'Uncategorized').trim();
          const categoryTotal = parseFloat(topCategory.total || 0);
          
          if (isNaN(categoryTotal)) {
            console.error('Invalid total value:', topCategory.total);
            return;
          }
          
          const newMaxCategory = {
            category: categoryName,
            total: categoryTotal.toFixed(2)
          };
          
          console.log('🎯 Setting maxCategory:', newMaxCategory);
          
          // Use functional update to ensure we're not using stale state
          // Update the ref first
          maxCategoryRef.current = newMaxCategory;
          
          // Then update the state to trigger a re-render
          setMaxCategory(prev => {
            console.log('🔄 Current maxCategory before update:', prev);
            // Only update if the values are different to prevent unnecessary re-renders
            if (prev.category === newMaxCategory.category && prev.total === newMaxCategory.total) {
              console.log('No change in maxCategory, skipping update');
              return prev;
            }
            return newMaxCategory;
          });
          
          // Update category data for the chart
          console.log('📈 Setting categoryData with', categories.length, 'categories');
          setCategoryData(categories);
        } else {
          console.warn('⚠️ No valid categories data received');
          if (isMounted) {
            setMaxCategory({ category: '', total: 0 });
          }
        }
        
        if (isMounted) {
          console.log('✅ Setting isLoadingCategories to false');
          setIsLoadingCategories(false);
        }
      } catch (err) {
        console.error('❌ Error in fetchCategoryData:', err);
        if (isMounted) {
          setError('Failed to load category data: ' + err.message);
          setCategoryData([]);
          setMaxCategory({ category: '', total: 0 });
          setIsLoadingCategories(false);
        }
      } finally {
        console.groupEnd();
      }
    };

    fetchCategoryData();
    
    return () => {
      console.log('🧹 Cleaning up category data fetch');
      isMounted = false;
    };
  }, []);

  // Fetch monthly data for the chart
  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/expenses/monthly-summary', {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch monthly data');
        }

        const data = await response.json();
        setMonthlyData(data.monthlyData || []);
        
        // Update max month if data is available
        if (data.monthlyData && data.monthlyData.length > 0) {
          const max = data.monthlyData.reduce((prev, current) => 
            (prev.total > current.total) ? prev : current
          );
          setMaxMonth(prev => ({
            ...prev,
            month: max.month,
            total: max.total
          }));
        }
        
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('Failed to load monthly data');
      } finally {
        setIsLoadingMonthly(false);
      }
    };

    fetchMonthlyData();
  }, []);

  // Fetch highest spending month data
  useEffect(() => {
    const fetchHighestSpendingMonth = async () => {
      try {
        setIsLoadingMonthly(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:5000/api/expenses/monthly-totals', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch monthly totals');
        }
        
        const data = await response.json();
        
        if (data.highestSpendingMonth) {
          setMaxMonth({
            month: data.highestSpendingMonth.month,
            year: data.highestSpendingMonth.year,
            total: parseFloat(data.highestSpendingMonth.total).toFixed(2)
          });
        }
        
      } catch (err) {
        console.error('Error fetching highest spending month:', err);
        // Fallback to static data if API fails
        if (monthlyData.length > 0) {
          const max = monthlyData.reduce((prev, current) => 
            (prev.total > current.total) ? prev : current
          );
          setMaxMonth({
            month: max.month,
            year: new Date().getFullYear(),
            total: max.total
          });
        }
      } finally {
        setIsLoadingMonthly(false);
      }
    };
    
    fetchHighestSpendingMonth();
  }, [monthlyData]);

  // Fetch recent expenses (latest 5)
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/expenses/recent', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch recent expenses');
        const data = await response.json();
        setRecentExpenses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error fetching recent expenses:', e);
        setRecentExpenses([]);
      }
    };
    fetchRecent();
  }, []);

  // Fetch current month's total from the API
  useEffect(() => {
    const fetchCurrentMonthTotal = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        console.log('Attempting to fetch current month total...');
        console.log('Using token:', token ? 'Token exists' : 'No token found');
        
        const response = await fetch('http://localhost:5000/api/expenses/current-month-total', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include'
        }).catch(networkError => {
          console.error('Network error:', networkError);
          throw new Error('Network error. Is the backend server running?');
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
            console.error('API Error response:', errorData);
          } catch (e) {
            console.error('Failed to parse error response as JSON');
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (data.total === undefined) {
          throw new Error('Invalid response format: total is missing');
        }
        
        setTotalSpent(Number(data.total) || 0);
        setError(null);
      } catch (err) {
        console.error('Error in fetchCurrentMonthTotal:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        
        // More descriptive error message
        setError(`Error: ${err.message}. Using sample data.`);
        
        // Fallback to static data if API fails
        const total = monthlyData.reduce((sum, item) => sum + item.total, 0);
        setTotalSpent(total);
        
        // Log the error to error tracking service (if available)
        if (process.env.NODE_ENV === 'production') {
          // In a real app, you would send this to an error tracking service
          console.error('Dashboard API Error:', {
            message: err.message,
            timestamp: new Date().toISOString(),
            endpoint: '/api/expenses/current-month-total'
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentMonthTotal();
    
    // Static max month fallback (will be overridden by API call)
    if (monthlyData.length > 0 && !maxMonth.month) {
      const max = monthlyData.reduce((prev, current) => 
        (prev.total > current.total) ? prev : current
      );
      setMaxMonth({
        month: max.month,
        year: new Date().getFullYear(),
        total: max.total
      });
    }
    
    // Find category with maximum expense (using static data for now)
    if (categoryData.length > 0) {
      const maxCat = categoryData.reduce((prev, current) => 
        (prev.total > current.total) ? prev : current
      );
      setMaxCategory(`${maxCat.category} ($${maxCat.total})`);
    }
  }, [monthlyData, categoryData]);

  const monthlyChartData = {
    labels: monthlyData.map(item => item.month),
    datasets: [{
      label: 'Monthly Expenses ($)',
      data: monthlyData.map(item => item.total),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  };

  const categoryChartData = {
    labels: categoryData.map(item => item.category),
    datasets: [{
      label: 'Expenses by Category ($)',
      data: categoryData.map(item => item.total),
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
      ],
      borderWidth: 1,
    }],
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="summary-cards">
        <div className="card">
          <h3>Total Spent This Month</h3>
          <p className="amount">${totalSpent.toFixed(2)}</p>
          {isLoading && <div className="loading">Loading...</div>}
          {error && (
            <div className="error" style={{ 
              color: '#721c24', 
              backgroundColor: '#f8d7da',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '0.9em',
              marginTop: '10px'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Highest Spending Month</h3>
          {isLoadingMonthly ? (
            <p>Loading...</p>
          ) : maxMonth.month ? (
            <div>
              <p>{`${maxMonth.month} ${maxMonth.year}`}</p>
              <p className="amount">${maxMonth.total}</p>
            </div>
          ) : (
            <p>No data available</p>
          )}
        </div>
        <div className="card">
          <h3>Top Category</h3>
          {isLoadingCategories ? (
            <p>Loading...</p>
          ) : maxCategoryRef.current?.category ? (
            <div>
              <p>{maxCategoryRef.current.category}</p>
              <p className="amount">${maxCategoryRef.current.total}</p>
              <div style={{fontSize: '0.8em', color: '#666', marginTop: '8px'}}>
               
               
              </div>
            </div>
          ) : (
            <div>
              <p>No category data available</p>
              <div style={{fontSize: '0.8em', color: '#666', marginTop: '8px'}}>
                <div>State: {JSON.stringify(maxCategoryRef.current)}</div>
                <div>Time: {new Date().toISOString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>Monthly Expenses</h3>
          {isLoadingMonthly ? (
            <p>Loading monthly data...</p>
          ) : monthlyData && monthlyData.length > 0 ? (
            <Bar 
              data={{
                labels: monthlyData.map(item => item.month || ''),
                datasets: [{
                  label: 'Monthly Expenses',
                  data: monthlyData.map(item => parseFloat(item.total) || 0),
                  backgroundColor: 'rgba(54, 162, 235, 0.5)',
                  borderColor: 'rgba(54, 162, 235, 1)',
                  borderWidth: 1
                }]
              }}
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: value => `$${value}`
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: context => `$${context.raw.toFixed(2)}`
                    }
                  }
                }
              }} 
            />
          ) : (
            <p>No monthly data available</p>
          )}
        </div>
        
        <div className="chart-container">
          <h3>Expenses by Category</h3>
          {isLoadingCategories ? (
            <p>Loading categories...</p>
          ) : categoryData && categoryData.length > 0 ? (
            <Doughnut 
              data={{
                labels: categoryData.map(item => item.name || item.category || 'Uncategorized'),
                datasets: [{
                  data: categoryData.map(item => parseFloat(item.total) || 0),
                  backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#8AC24A', '#FF5252',
                    '#607D8B', '#9C27B0'
                  ],
                  borderWidth: 1
                }]
              }}
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                      }
                    }
                  },
                  legend: {
                    position: 'right',
                    labels: {
                      boxWidth: 15,
                      padding: 15,
                      usePointStyle: true
                    }
                  }
                },
                cutout: '60%'
              }} 
            />
          ) : (
            <p>No category data available</p>
          )}
        </div>
      </div>
      
      <div className="recent-expenses">
        <h3>Recent Expenses</h3>
        <div className="expenses-list">
          {recentExpenses.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.description}</td>
                    <td>{expense.category}</td>
                    <td>{new Date(expense.date).toLocaleDateString()}</td>
                    <td>${expense.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No recent expenses found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
