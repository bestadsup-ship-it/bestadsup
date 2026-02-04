import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, analyticsAPI, adUnitsAPI } from '../api/client';
import MetricCard from '../components/MetricCard';
import MetricsChart from '../components/MetricsChart';
import AdUnitsList from '../components/AdUnitsList';
import DateRangePicker from '../components/DateRangePicker';
import '../styles/dashboard.css';

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [adUnits, setAdUnits] = useState([]);
  const [adUnitPerformance, setAdUnitPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const navigate = useNavigate();
  const user = authAPI.getUser();

  const getDateRange = () => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          start = new Date(customStartDate);
          end.setTime(new Date(customEndDate).getTime());
        }
        break;
      default:
        start.setDate(end.getDate() - 7);
    }

    return { start, end };
  };

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const { start, end } = getDateRange();

      const [metricsData, dailyData, adUnitsData, performanceData] = await Promise.all([
        analyticsAPI.getMetrics(start, end),
        analyticsAPI.getDailyMetrics(start, end),
        adUnitsAPI.getAll(),
        analyticsAPI.getAdUnitPerformance(start, end),
      ]);

      setMetrics(metricsData);
      setDailyMetrics(dailyData);
      setAdUnits(adUnitsData);
      setAdUnitPerformance(performanceData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, customStartDate, customEndDate]);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString();
  };

  const formatCurrency = (num) => {
    return '$' + num.toFixed(2);
  };

  const formatPercentage = (num) => {
    return num.toFixed(2) + '%';
  };

  if (loading && !metrics) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src="/BestAdsUp.jpg"
              alt="BestAdsUp Logo"
              style={{ width: '50px', height: '50px', borderRadius: '50%' }}
            />
            <h1>BestAdsUp</h1>
          </div>
          {user && <p className="user-info">Welcome, {user.email}</p>}
        </div>
        <div className="header-right">
          <button onClick={loadData} className="btn-secondary" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="error-message">{error}</div>}

        <DateRangePicker
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />

        {metrics && (
          <>
            <div className="metrics-grid">
              <MetricCard
                title="Total Impressions"
                value={formatNumber(metrics.impressions || 0)}
                subtitle="Ad views"
              />
              <MetricCard
                title="Total Clicks"
                value={formatNumber(metrics.clicks || 0)}
                subtitle={`CTR: ${formatPercentage(
                  metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0
                )}`}
              />
              <MetricCard
                title="Revenue"
                value={formatCurrency(metrics.revenue || 0)}
                subtitle={`eCPM: ${formatCurrency(
                  metrics.impressions > 0 ? (metrics.revenue / metrics.impressions) * 1000 : 0
                )}`}
              />
              <MetricCard
                title="Fill Rate"
                value={formatPercentage(metrics.fillRate || 0)}
                subtitle="Ad requests filled"
              />
            </div>

            {dailyMetrics.length > 0 && (
              <div className="chart-section">
                <h2>Performance Over Time</h2>
                <MetricsChart data={dailyMetrics} />
              </div>
            )}

            {adUnitPerformance.length > 0 && (
              <div className="ad-units-section">
                <h2>Ad Units Performance</h2>
                <AdUnitsList
                  adUnits={adUnitPerformance}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                  formatPercentage={formatPercentage}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
