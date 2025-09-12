import React, { useState, useEffect } from 'react';
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

  // Generate years for the dropdown (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => year - i);
  
  // Months for display
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchCategoriesFor = React.useCallback(async (monthNumber, targetYear) => {
    try {
      const monthParam = String(monthNumber).padStart(2, '0');
      const response = await fetch(`http://localhost:5000/api/expenses/categories?month=${monthParam}&year=${targetYear}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const categories = await response.json();
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

  // Fetch monthly data from the backend
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/expenses/monthly?year=${year}`);
        if (!response.ok) throw new Error('Failed to fetch monthly data');
        
        const monthlyData = await response.json();
        
        // Format data for the chart - ensure we have all 12 months
        const formattedData = Array(12).fill().map((_, index) => {
          const monthNumber = (index + 1).toString().padStart(2, '0');
          // Handle both string and number month formats
          const monthData = monthlyData.find(m => 
            m.month === monthNumber || m.month === index + 1 || m.month === String(index + 1)
          ) || { 
            total: 0, 
            count: 0 
          };
          
          return {
            month: index + 1,
            year: monthData.year || year,
            total: parseFloat(monthData.total) || 0,
            count: parseInt(monthData.count) || 0,
            categories: monthData.categories || [] // Will be populated when month is selected
          };
        });
        
        setMonthlyData(formattedData);
        
        // Set current month as selected by default
        const currentMonth = new Date().getMonth() + 1;
        const currentMonthData = formattedData.find(m => m.month === currentMonth);
        if (currentMonthData) {
          setSelectedMonth(currentMonthData);
          // Fetch categories for current month so donut shows immediately
          fetchCategoriesFor(currentMonth, currentMonthData.year || year);
        }
        
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('Failed to load expense data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMonthlyData();
  }, [year, fetchCategoriesFor]);

  // Prepare chart data
  const monthlyChartData = {
    labels: monthlyData.map((_, i) => months[i].substring(0, 3)),
    datasets: [
      {
        label: 'Monthly Expenses ($)',
        data: monthlyData.map(month => month.total),
        backgroundColor: monthlyData.map((_, index) => 
          selectedMonth?.month === index + 1 ? 'rgba(54, 162, 235, 0.8)' : 'rgba(75, 192, 192, 0.6)'
        ),
        borderColor: monthlyData.map((_, index) =>
          selectedMonth?.month === index + 1 ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const categoryChartData = {
    labels: categoryData.map(item => item.name),
    datasets: [
      {
        label: 'Expenses by Category ($)',
        data: categoryData.map(item => item.amount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return <div className="loading">Loading expense data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

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
          <div className="chart-wrapper">
            <Bar 
              data={{
                labels: months.map(month => month.substring(0, 3)),
                datasets: [{
                  label: 'Monthly Expenses ($)',
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
                      callback: value => `$${value}`
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: context => ` $${context.raw}`
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {selectedMonth && (
          <div className="category-breakdown">
            <h2>Category Breakdown for {months[selectedMonth.month - 1]}</h2>
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
                            `${label}: $${value.toFixed(2)}`,
                            `(${percentage}% of total)`
                          ];
                        }
                      }
                    },
                    // Custom center text plugin config
                    centerText: {
                      text: `$${categoryData.reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toFixed(2)}`
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
                    <div className="category-amount">${category.amount.toFixed(2)}</div>
                    <div className="category-percentage">
                      {((category.amount / categoryData.reduce((sum, cat) => sum + cat.amount, 0)) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
                
                <div className="category-item total">
                  <div className="category-name">Total</div>
                  <div className="category-amount">
                    ${selectedMonth.total.toFixed(2)}
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
