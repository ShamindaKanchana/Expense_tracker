import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { getChartTheme } from '../theme/chartTheme';
import { translateCategory } from '../utils/categories';
import { allMonthLabels } from '../utils/months';
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const chartTheme = useMemo(() => getChartTheme(theme), [theme]);
  const [year, setYear] = useState(null);
  const [years, setYears] = useState([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  
  // Natural short names for compact UI (not first-3-chars of full names)
  const monthsShort = useMemo(() => allMonthLabels(t, 'short'), [t]);
  const monthsFull = useMemo(() => allMonthLabels(t, 'full'), [t]);

  const fetchCategoriesFor = useCallback(async (monthNumber, targetYear) => {
    try {
      const monthParam = String(monthNumber).padStart(2, '0');
      const response = await api.get(`/expenses/categories?month=${monthParam}&year=${targetYear}`);
      const categories = response.data;
      // Map backend { name/ category, total } to { name, amount }
      const mapped = (categories || []).map(c => ({
        name: c.name || c.category || '',
        amount: Number(c.total) || 0
      }));
      setCategoryData(mapped);
    } catch (e) {
      console.error('Error fetching categories for month:', monthNumber, 'year:', targetYear, e);
      setCategoryData([]);
    }
  }, []);

  // Load years that have expense data for this user only
  useEffect(() => {
    const loadYears = async () => {
      setYearsLoaded(false);
      try {
        const response = await api.get('/expenses/years');
        const list = Array.isArray(response.data?.years)
          ? response.data.years.map(Number).filter((y) => !Number.isNaN(y))
          : [];
        setYears(list);
        if (list.length > 0) {
          setYear((prev) => (prev && list.includes(prev) ? prev : list[0]));
        } else {
          setYear(null);
        }
      } catch (err) {
        console.error('Error fetching expense years:', err);
        setYears([]);
        setYear(null);
        setError(t('monthly.failedYears'));
      } finally {
        setYearsLoaded(true);
      }
    };
    loadYears();
  }, [t]);

  const handleMonthSelect = React.useCallback((monthNumber) => {
    const month = monthlyData.find(m => m.month === monthNumber);
    if (month) {
      setSelectedMonth(month);
      fetchCategoriesFor(monthNumber, month.year || year);
    }
  }, [monthlyData, fetchCategoriesFor, year]);

  const handleYearChange = (e) => {
    setYear(parseInt(e.target.value, 10));
  };

  // Fetch monthly data for the selected year only
  useEffect(() => {
    if (!yearsLoaded) return undefined;

    if (!year || years.length === 0) {
      setMonthlyData([]);
      setSelectedMonth(null);
      setCategoryData([]);
      setLoading(false);
      return undefined;
    }

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
        setError(t('monthly.failedYears'));
        setMonthlyData([]);
        setSelectedMonth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
    return undefined;
  }, [year, yearsLoaded, years.length, fetchCategoriesFor, t]);

  if (!yearsLoaded || loading) {
    return <div className="loading">{t('monthly.loading')}</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (years.length === 0) {
    return (
      <div className="monthly-expenses">
        <div className="header">
          <h1>{t('monthly.title')}</h1>
        </div>
        <p className="empty-year-message">
          {t('monthly.noYears')}
        </p>
      </div>
    );
  }

  const yearTotal = monthlyData.reduce((sum, m) => sum + (m.total || 0), 0);
  const hasYearData = yearTotal > 0;

  return (
    <div className="monthly-expenses">
      <div className="header">
        <h1>{t('monthly.title')}</h1>
        <div className="year-selector">
          <label htmlFor="year">{t('monthly.year')}: </label>
          <select id="year" value={year ?? ''} onChange={handleYearChange}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="month-selector">
        {monthsShort.map((month, index) => (
          <button
            key={index}
            className={`month-button ${selectedMonth?.month === index + 1 ? 'active' : ''}`}
            onClick={() => handleMonthSelect(index + 1)}
            title={monthsFull[index]}
          >
            {month}
          </button>
        ))}
      </div>
      
      <div className="chart-container">
        {/* Monthly Bar Chart */}
        <div className="monthly-chart">
          <h2>{t('dashboard.monthlyExpenses')} — {year}</h2>
          {!hasYearData ? (
            <p className="empty-year-message">
              {t('monthly.noYears')}
            </p>
          ) : (
          <div className="chart-wrapper">
            <Bar
              key={`monthly-bar-${theme}`}
              data={{
                labels: monthsShort,
                datasets: [{
                  label: t('dashboard.monthlyExpenses'),
                  data: monthlyData.map((m) => m.total),
                  backgroundColor: monthlyData.map((_, index) =>
                    selectedMonth?.month === index + 1
                      ? 'rgba(54, 162, 235, 0.85)'
                      : 'rgba(75, 192, 192, 0.65)'
                  ),
                  borderColor: monthlyData.map((_, index) =>
                    selectedMonth?.month === index + 1
                      ? 'rgba(54, 162, 235, 1)'
                      : 'rgba(75, 192, 192, 1)'
                  ),
                  borderWidth: 1,
                  borderRadius: 3,
                  maxBarThickness: 36
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  // Extra bottom room so rotated month labels are not clipped
                  padding: {
                    top: 4,
                    right: isNarrow ? 2 : 6,
                    bottom: isNarrow ? 4 : 2,
                    left: 0
                  }
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: chartTheme.text,
                      // Horizontal labels overlap on phones — angle them on narrow screens
                      maxRotation: isNarrow ? 65 : 0,
                      minRotation: isNarrow ? 45 : 0,
                      autoSkip: false,
                      font: { size: isNarrow ? 9 : 11 },
                      padding: isNarrow ? 2 : 4
                    }
                  },
                  y: {
                    beginAtZero: true,
                    grace: '10%',
                    grid: { color: chartTheme.grid },
                    ticks: {
                      color: chartTheme.text,
                      maxTicksLimit: isNarrow ? 5 : 6,
                      font: { size: isNarrow ? 9 : 10 },
                      callback: (value) => `Rs ${value}`
                    }
                  }
                },
                plugins: {
                  // Title already describes the chart; free vertical space for labels on mobile
                  legend: {
                    display: !isNarrow,
                    position: 'top',
                    align: 'center',
                    labels: {
                      color: chartTheme.text,
                      boxWidth: 10,
                      font: { size: 11 },
                      padding: 8
                    }
                  },
                  tooltip: {
                    backgroundColor: chartTheme.tooltipBg,
                    titleColor: chartTheme.tooltipText,
                    bodyColor: chartTheme.tooltipText,
                    callbacks: {
                      title: (items) => {
                        const i = items[0]?.dataIndex;
                        return i != null ? monthsFull[i] : '';
                      },
                      label: (context) => `Rs ${Number(context.raw).toFixed(2)}`
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
            <h2>
              {t('monthly.categoryBreakdown')} — {monthsFull[selectedMonth.month - 1]} {year}
            </h2>
            <div className="donut-chart-container chart-wrapper">
              <Doughnut
                key={`monthly-donut-${theme}`}
                data={{
                  labels: categoryData.map((cat) => translateCategory(t, cat.name)),
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
                    borderColor: chartTheme.border,
                    borderWidth: 2,
                    hoverOffset: 6
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: {
                      position: isNarrow ? 'bottom' : 'right',
                      labels: {
                        color: chartTheme.text,
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                          size: 11
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: chartTheme.tooltipBg,
                      titleColor: chartTheme.tooltipText,
                      bodyColor: chartTheme.tooltipText,
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
                    // Canvas text is not CSS-driven — use theme colors (white/light in dark mode)
                    const labelColor = chartTheme.textMuted;
                    const valueColor = chartTheme.text;
                    ctx.save();
                    ctx.fillStyle = labelColor;
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('Total', centerX, centerY - 14);
                    ctx.fillStyle = valueColor;
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyExpenses;
