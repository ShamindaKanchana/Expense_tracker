import React, { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useTranslation } from 'react-i18next';
import { translateCategory } from '../utils/categories';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryPieChart = ({ categoryData }) => {
  const { t } = useTranslation();

  const data = useMemo(
    () => ({
      labels: categoryData.map((cat) => translateCategory(t, cat.name)),
      datasets: [
        {
          data: categoryData.map((cat) => cat.amount),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }
      ]
    }),
    [categoryData, t]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: 'right'
        },
        tooltip: {
          callbacks: {
            label(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total ? Math.round((value / total) * 100) : 0;
              return `${label}: Rs ${Number(value).toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }),
    []
  );

  return (
    <div className="pie-chart-container" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
      <Pie data={data} options={options} />
    </div>
  );
};

export default CategoryPieChart;
