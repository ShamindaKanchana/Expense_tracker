import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip, 
  Legend 
} from 'chart.js';
import api from '../services/api';
import './MonthlyExpenses.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip, 
  Legend
);

const MonthlyExpenses = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Always anchor dropdown to the calendar year, not the selected year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  
  // Months for display
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchCategoriesFor = useCallback(async (monthNumber, targetYear) => {
    try {
      const monthParam = String(monthNumber).padStart(2, '0');
      const response = await api.get(`/expenses/categories?month=${monthParam}&year=${targetYear}`);
      const categories = response.data;
      // Map backend { name/ category, total } to { name, amount }
      const mapped = (categories || []).map(c => ({
        name: c.name || c.category || 'Uncategorized',
        amount: Number(c.total) || 0
      }));
      setCategoryData(mapped);
    } catch (e) {
      console.error('Error fetching categories for month:', monthNumber, 'year:', targetYear, e);
      setCategoryData([]);
    }
  }, []);

  const handleMonthSelect = React.useCallback((monthNumber) => {
    const month = monthlyData.find(m => m.month === monthNumber);
    if (month) {
      setSelectedMonth(month);
      fetchCategoriesFor(monthNumber, month.year || year);
    }
  }, [monthlyData, fetchCategoriesFor, year]);

  const handleYearChange = (e) => {
    setYear(parseInt(e.target.value));
  };

  // Fetch monthly data for the selected year only
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      setError('');
      setCategoryData([]);
      try {
        const response = await api.get(`/expenses/monthly?year=${year}`);
        const rows = Array.isArray(response.data) ? response.data : [];

        // Build 12 months for this year; match only rows for the selected year
        const formattedData = Array.from({ length: 12 }, (_, index) => {
          const monthNumber = index + 1;
          const monthData = rows.find((m) => {
            const mMonth = Number(m.month);
            const mYear = Number(m.year);
            return mMonth === monthNumber && (!m.year || mYear === year);
          });

          return {
            month: monthNumber,
            year,
            total: monthData ? parseFloat(monthData.total) || 0 : 0,
            count: monthData ? parseInt(monthData.count, 10) || 0 : 0,
            categories: []
          };
        });

        setMonthlyData(formattedData);

        // Prefer current calendar month when viewing this year; otherwise first month with spend
        const now = new Date();
        const preferMonth =
          year === now.getFullYear()
            ? now.getMonth() + 1
            : formattedData.find((m) => m.total > 0)?.month || 1;
        const selected = formattedData.find((m) => m.month === preferMonth) || formattedData[0];
        setSelectedMonth(selected);
        fetchCategoriesFor(selected.month, year);
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('Failed to load expense data. Please try again later.');
        setMonthlyData([]);
        setSelectedMonth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [year, fetchCategoriesFor]);

  if (loading) {
    return <div className="loading">Loading expense data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const yearTotal = monthlyData.reduce((sum, m) => sum + (m.total || 0), 0);
  const hasYearData = yearTotal > 0;

  return (
    <div className="monthly-expenses">
      <div className="header">
        <h1>Monthly Expense Report</h1>
        <div className="year-selector">
          <label htmlFor="year">Select Year: </label>
          <select id="year" value={year} onChange={handleYearChange}>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="month-selector">
        {months.map((month, index) => (
          <button
            key={index}
            className={`month-button ${selectedMonth?.month === index + 1 ? 'active' : ''}`}
            onClick={() => handleMonthSelect(index + 1)}
          >
            {month.substring(0, 3)}
          </button>
        ))}
      </div>
      
      <div className="chart-container">
        {/* Monthly Bar Chart */}
        <div className="monthly-chart">
          <h2>Monthly Expenses for {year}</h2>
          {!hasYearData ? (
            <p className="empty-year-message">
              No expenses recorded for {year}. Try another year or add an expense.
            </p>
          ) : (
          <div className="chart-wrapper">
            <Bar 
              data={{
                labels: months.map(month => month.substring(0, 3)),
                datasets: [{
                  label: 'Monthly Expenses (Rs)',
                  data: monthlyData.map(month => month.total),
                  backgroundColor: monthlyData.map((_, index) => 
                    selectedMonth?.month === index + 1 ? 'rgba(54, 162, 235, 0.8)' : 'rgba(75, 192, 192, 0.6)'
                  ),
                  borderColor: monthlyData.map((_, index) =>
                    selectedMonth?.month === index + 1 ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)'
                  ),
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
                      callback: value => `Rs ${value}`
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: context => ` Rs ${context.raw}`
                    }
                  }
                }
              }} 
            />
          </div>
          )}
        </div>

        {hasYearData && selectedMonth && (
          <div className="category-breakdown">
            <h2>Category Breakdown for {months[selectedMonth.month - 1]} {year}</h2>
            <div className="donut-chart-container" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              <Doughnut 
                data={{
                  labels: categoryData.map(cat => cat.name),
                  datasets: [{
                    data: categoryData.map(cat => cat.amount),
                    backgroundColor: [
                      'rgba(67, 97, 238, 0.8)',
                      'rgba(103, 58, 183, 0.8)',
                      'rgba(0, 150, 136, 0.8)',
                      'rgba(255, 152, 0, 0.8)',
                      'rgba(244, 67, 54, 0.8)',
                      'rgba(76, 175, 80, 0.8)',
                      'rgba(63, 81, 181, 0.8)',
                      'rgba(233, 30, 99, 0.8)'
                    ],
                    borderColor: 'white',
                    borderWidth: 2,
                    hoverOffset: 10
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  cutout: '70%',
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                          size: 12
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleFont: { size: 14, weight: 'bold' },
                      bodyFont: { size: 13 },
                      padding: 12,
                      displayColors: true,
                      usePointStyle: true,
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = Math.round((value / total) * 100);
                          return [
                            `${label}: Rs ${value.toFixed(2)}`,
                            `(${percentage}% of total)`
                          ];
                        }
                      }
                    },
                    // Custom center text plugin config
                    centerText: {
                      text: `Rs ${categoryData.reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toFixed(2)}`
                    }
                  },
                  layout: {
                    padding: 10
                  }
                }}
                plugins={[{
                  id: 'centerText',
                  afterDraw: (chart, args, pluginOptions) => {
                    const { ctx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    if (!meta || !meta.data || !meta.data[0]) return;
                    const centerX = meta.data[0].x;
                    const centerY = meta.data[0].y;
                    ctx.save();
                    // small title
                    ctx.fillStyle = '#666';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('Total', centerX, centerY - 14);
                    // value
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 20px sans-serif';
                    const text = pluginOptions?.text || '';
                    ctx.fillText(text, centerX, centerY + 8);
                    ctx.restore();
                  }
                }]}
              />
            </div>
            
            <div className="category-details">
              <h3>Expense Details</h3>
              <div className="details-grid">
                {categoryData.map((category, index) => (
                  <div key={index} className="category-item">
                    <div className="category-name" style={{ 
                      backgroundColor: `rgba(${index * 50}, ${200 - index * 20}, ${100 + index * 30}, 0.2)`,
                      borderLeft: `4px solid rgba(${index * 50}, ${200 - index * 20}, ${100 + index * 30}, 1)`
                    }}>
                      {category.name}
                    </div>
                    <div className="category-amount">Rs {category.amount.toFixed(2)}</div>
                    <div className="category-percentage">
                      {((category.amount / categoryData.reduce((sum, cat) => sum + cat.amount, 0)) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
                
                <div className="category-item total">
                  <div className="category-name">Total</div>
                  <div className="category-amount">
                    Rs {selectedMonth.total.toFixed(2)}
                  </div>
                  <div className="category-percentage">100%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyExpenses;
