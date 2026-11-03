import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';
import { translateCategory } from '../utils/categories';
import CategoryPieChart from './CategoryPieChart';
import './Reports.css';

const LIST_LIMIT = 10;

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// RPT-01: local-date presets (no UTC shift) for the inclusive range.
const computePresetRange = (preset) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (preset) {
    case 'today':
      break;
    case 'week': {
      const day = today.getDay(); // 0=Sun .. 6=Sat
      const diffToMonday = (day + 6) % 7;
      start.setDate(today.getDate() - diffToMonday);
      end.setDate(start.getDate() + 6);
      break;
    }
    case 'month':
      start.setDate(1);
      end.setMonth(today.getMonth() + 1, 0);
      break;
    case 'last7':
      start.setDate(today.getDate() - 6);
      break;
    case 'last30':
      start.setDate(today.getDate() - 29);
      break;
    default:
      break;
  }

  return { startDate: toISODate(start), endDate: toISODate(end) };
};

const PRESETS = ['today', 'week', 'month', 'last7', 'last30', 'custom'];

const Reports = () => {
  const { t, i18n } = useTranslation();

  const initialRange = useMemo(() => computePresetRange('month'), []);
  const [preset, setPreset] = useState('month');
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [activeRange, setActiveRange] = useState(initialRange);

  const [categoryData, setCategoryData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');
  // On phones the list is collapsed by default so the summary + chart fit
  // on one screen; desktop shows it straight away.
  const [showList, setShowList] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 640px)').matches
  );

  const fetchCategories = useCallback(async (range) => {
    const response = await api.get('/expenses/categories', {
      params: { startDate: range.startDate, endDate: range.endDate }
    });
    return (response.data || []).map((c) => ({
      name: c.name || c.category || '',
      amount: Number(c.total) || 0,
      count: Number(c.count) || 0
    }));
  }, []);

  const fetchExpenses = useCallback(async (range, page) => {
    const response = await api.get('/expenses/list', {
      params: {
        startDate: range.startDate,
        endDate: range.endDate,
        page,
        limit: LIST_LIMIT
      }
    });
    const data = response.data || {};
    return {
      expenses: (data.expenses || []).map((e) => ({
        ...e,
        amount: Number(e.amount) || 0
      })),
      pagination: data.pagination || { page, totalPages: 1, total: 0 }
    };
  }, []);

  // Aggregation + first page whenever the applied range changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [categories, list] = await Promise.all([
          fetchCategories(activeRange),
          fetchExpenses(activeRange, 1)
        ]);
        if (cancelled) return;
        setCategoryData(categories);
        setExpenses(list.expenses);
        setPagination(list.pagination);
        setListPage(list.pagination.page || 1);
      } catch (err) {
        if (cancelled) return;
        setError(getErrorMessage(err, t('reports.failed')));
        setCategoryData([]);
        setExpenses([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeRange, fetchCategories, fetchExpenses, t]);

  const applyRange = (start, end) => {
    if (!start || !end) {
      setRangeError(t('reports.invalidRange'));
      return;
    }
    if (start > end) {
      setRangeError(t('reports.invalidRange'));
      return;
    }
    setRangeError('');
    setActiveRange({ startDate: start, endDate: end });
  };

  const handlePreset = (nextPreset) => {
    setPreset(nextPreset);
    setRangeError('');
    if (nextPreset === 'custom') return;
    const range = computePresetRange(nextPreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    applyRange(range.startDate, range.endDate);
  };

  const handleApplyCustom = () => {
    applyRange(startDate, endDate);
  };

  const handlePageChange = async (page) => {
    if (page < 1 || page > pagination.totalPages || page === listPage) return;
    setLoadingList(true);
    try {
      const list = await fetchExpenses(activeRange, page);
      setExpenses(list.expenses);
      setPagination(list.pagination);
      setListPage(list.pagination.page || page);
    } catch (err) {
      setError(getErrorMessage(err, t('reports.failed')));
    } finally {
      setLoadingList(false);
    }
  };

  const totalSpent = useMemo(
    () => categoryData.reduce((sum, c) => sum + (c.amount || 0), 0),
    [categoryData]
  );
  const totalCount = useMemo(
    () => categoryData.reduce((sum, c) => sum + (c.count || 0), 0),
    [categoryData]
  );

  // Keep the donut readable: top 6 categories + "Other".
  const chartData = useMemo(() => {
    const sorted = [...categoryData].sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((sum, c) => sum + (c.amount || 0), 0);
    if (rest > 0) top.push({ name: t('reports.other'), amount: rest });
    return top;
  }, [categoryData, t]);

  const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
  // Date-only strings must be parsed as local dates, not UTC midnight,
  // otherwise the displayed day can shift in timezones behind UTC.
  const formatDate = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(i18n.language || undefined);
    }
    return new Date(value).toLocaleDateString(i18n.language || undefined);
  };

  const isEmpty = !loading && categoryData.length === 0;

  return (
    <div className="reports">
      <div className="reports-header">
        <h1>{t('reports.title')}</h1>
      </div>

      <div className="reports-range-card">
        <div className="reports-presets" role="group" aria-label={t('reports.range')}>
          {PRESETS.map((key) => (
            <button
              key={key}
              type="button"
              className={`reports-preset ${preset === key ? 'active' : ''}`}
              onClick={() => handlePreset(key)}
            >
              {t(`reports.preset_${key}`)}
            </button>
          ))}
        </div>

        <div className="reports-dates">
          <label htmlFor="reports-start">
            {t('reports.start')}
            <input
              id="reports-start"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
            />
          </label>
          <label htmlFor="reports-end">
            {t('reports.end')}
            <input
              id="reports-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
            />
          </label>
          {preset === 'custom' && (
            <button type="button" className="reports-apply" onClick={handleApplyCustom}>
              {t('reports.apply')}
            </button>
          )}
        </div>
        {rangeError && <p className="reports-range-error" role="alert">{rangeError}</p>}
      </div>

      {loading ? (
        <div className="loading">{t('reports.loading')}</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="reports-summary">
            <div className="reports-summary-item">
              <span className="reports-summary-label">{t('reports.totalSpent')}</span>
              <span className="reports-summary-value">{formatMoney(totalSpent)}</span>
            </div>
            <div className="reports-summary-item">
              <span className="reports-summary-label">{t('reports.transactions')}</span>
              <span className="reports-summary-value">{totalCount}</span>
            </div>
            <div className="reports-summary-item">
              <span className="reports-summary-label">{t('reports.range')}</span>
              <span className="reports-summary-value reports-summary-range">
                {formatDate(activeRange.startDate)} – {formatDate(activeRange.endDate)}
              </span>
            </div>
          </div>

          {isEmpty ? (
            <p className="reports-empty">{t('reports.noData')}</p>
          ) : (
            <div className="reports-grid">
              <div className="reports-chart-card">
                <h2>{t('reports.byCategory')}</h2>
                <div className="reports-chart-wrapper">
                  <CategoryPieChart
                    categoryData={chartData}
                    legendPosition="bottom"
                    maintainAspectRatio={false}
                    showLegend={false}
                    className="reports-pie"
                  />
                </div>
                <ul className="reports-category-list">
                  {categoryData.map((c, index) => {
                    const pct = totalSpent > 0 ? (c.amount / totalSpent) * 100 : 0;
                    return (
                      <li key={c.name} className="reports-category-row">
                        <span className="reports-category-name">
                          <span
                            className={`reports-category-dot reports-dot-${index % 6}`}
                            aria-hidden="true"
                          />
                          {translateCategory(t, c.name)}
                        </span>
                        <span className="reports-category-amount">{formatMoney(c.amount)}</span>
                        <span className="reports-category-pct">{pct.toFixed(1)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="reports-list-card">
                <div className="reports-list-head">
                  <h2>{t('reports.transactionsCount', { count: totalCount })}</h2>
                  {expenses.length > 0 && (
                    <button
                      type="button"
                      className="reports-list-toggle"
                      aria-expanded={showList}
                      onClick={() => setShowList((visible) => !visible)}
                    >
                      {showList ? t('reports.hideTransactions') : t('reports.viewTransactions')}
                    </button>
                  )}
                </div>
                {expenses.length === 0 ? (
                  <p className="reports-empty">{t('reports.noData')}</p>
                ) : showList ? (
                  <>
                    <div className="reports-table-wrap">
                      <table className="reports-table">
                        <thead>
                          <tr>
                            <th>{t('reports.date')}</th>
                            <th>{t('reports.category')}</th>
                            <th>{t('reports.amount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((e) => (
                            <tr key={e.id}>
                              <td>{formatDate(e.date)}</td>
                              <td>{translateCategory(t, e.category)}</td>
                              <td className="reports-amount-cell">{formatMoney(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="reports-pagination">
                      <button
                        type="button"
                        onClick={() => handlePageChange(listPage - 1)}
                        disabled={listPage <= 1 || loadingList}
                      >
                        {t('reports.prev')}
                      </button>
                      <span>
                        {t('reports.page', {
                          page: listPage,
                          total: Math.max(1, pagination.totalPages || 1)
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePageChange(listPage + 1)}
                        disabled={listPage >= pagination.totalPages || loadingList}
                      >
                        {t('reports.next')}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
