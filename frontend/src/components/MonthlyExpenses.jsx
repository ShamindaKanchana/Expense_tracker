import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import './MonthlyExpenses.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  const handleMonthSelect = React.useCallback((monthNumber) => {
    const month = monthlyData.find(m => m.month === monthNumber);
    if (month) {
      setSelectedMonth(month);
      setCategoryData(month.categories);
    }
  }, [monthlyData]);

  const handleYearChange = (e) => {
    setYear(parseInt(e.target.value));
  };

  // Simulate fetching monthly data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      try {
        // In a real app, you would fetch this data from your API
        // const response = await fetch(`/api/expenses/summary?year=${year}`);
        // const data = await response.json();
        
        // Simulated data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const simulatedData = Array(12).fill(0).map((_, i) => ({
          month: i + 1,
          total: Math.floor(Math.random() * 3000) + 500, // Random amount between 500 and 3500
          categories: [
            { name: 'Food', amount: Math.floor(Math.random() * 1000) + 100 },
            { name: 'Transport', amount: Math.floor(Math.random() * 800) + 50 },
            { name: 'Entertainment', amount: Math.floor(Math.random() * 600) + 50 },
            { name: 'Bills', amount: Math.floor(Math.random() * 1500) + 200 },
            { name: 'Others', amount: Math.floor(Math.random() * 400) + 50 },
          ]
        }));
        
        setMonthlyData(simulatedData);
        
        // Set the current month as selected by default
        const currentMonth = new Date().getMonth();
        if (year === new Date().getFullYear()) {
          const month = simulatedData.find(m => m.month === currentMonth + 1);
          if (month) {
            setSelectedMonth(month);
            setCategoryData(month.categories);
          }
        } else {
          const month = simulatedData.find(m => m.month === 1);
          if (month) {
            setSelectedMonth(month);
            setCategoryData(month.categories);
          }
        }
        
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('Failed to load expense data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMonthlyData();
  }, [year]);

  // Prepare chart data
  const monthlyChartData = {
    labels: monthlyData.map((_, i) => months[i].substring(0, 3)),
    datasets: [
      {
        label: 'Monthly Expenses ($)',
        data: monthlyData.map(month => month.total),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
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
        <div className="monthly-chart">
          <h2>{selectedMonth ? months[selectedMonth.month - 1] : ''} {year} Overview</h2>
          <div className="chart-wrapper">
            <Bar 
              data={monthlyChartData} 
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
            <div className="chart-wrapper">
              <Bar 
                data={categoryChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: {
                    x: {
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
                    ${categoryData.reduce((sum, cat) => sum + cat.amount, 0).toFixed(2)}
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
