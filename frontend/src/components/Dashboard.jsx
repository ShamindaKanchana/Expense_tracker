import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [monthlyData] = useState([
    { month: 'Jan', total: 1200 },
    { month: 'Feb', total: 1900 },
    { month: 'Mar', total: 1500 },
    { month: 'Apr', total: 2100 },
  ]);
  
  const [categoryData] = useState([
    { category: 'Food', total: 500 },
    { category: 'Transport', total: 300 },
    { category: 'Entertainment', total: 200 },
    { category: 'Bills', total: 700 },
  ]);
  
  const [recentExpenses] = useState([
    { id: 1, description: 'Grocery Shopping', amount: 150, category: 'Food', date: '2023-04-15' },
    { id: 2, description: 'Movie Tickets', amount: 40, category: 'Entertainment', date: '2023-04-14' },
    { id: 3, description: 'Gas', amount: 60, category: 'Transport', date: '2023-04-13' },
  ]);
  
  const [totalSpent, setTotalSpent] = useState(0);
  const [maxMonth, setMaxMonth] = useState('');
  const [maxCategory, setMaxCategory] = useState('');

  useEffect(() => {
    // Calculate total spent
    const total = monthlyData.reduce((sum, item) => sum + item.total, 0);
    setTotalSpent(total);
    
    // Find month with maximum expense
    if (monthlyData.length > 0) {
      const max = monthlyData.reduce((prev, current) => 
        (prev.total > current.total) ? prev : current
      );
      setMaxMonth(`${max.month} ($${max.total})`);
    }
    
    // Find category with maximum expense
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
          <p className="amount">${totalSpent}</p>
        </div>
        <div className="card">
          <h3>Highest Spending Month</h3>
          <p>{maxMonth || 'N/A'}</p>
        </div>
        <div className="card">
          <h3>Top Category</h3>
          <p>{maxCategory || 'N/A'}</p>
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>Monthly Expenses</h3>
          <Bar 
            data={monthlyChartData} 
            options={{ 
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }} 
          />
        </div>
        
        <div className="chart-container">
          <h3>Expenses by Category</h3>
          <Doughnut 
            data={categoryChartData} 
            options={{ 
              responsive: true,
              maintainAspectRatio: false
            }} 
          />
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
