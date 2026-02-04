import React from 'react';
import '../styles/components.css';

function DateRangePicker({
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) {
  return (
    <div className="date-range-picker">
      <div className="date-range-buttons">
        <button
          className={`date-range-btn ${dateRange === '7d' ? 'active' : ''}`}
          onClick={() => setDateRange('7d')}
        >
          Last 7 Days
        </button>
        <button
          className={`date-range-btn ${dateRange === '30d' ? 'active' : ''}`}
          onClick={() => setDateRange('30d')}
        >
          Last 30 Days
        </button>
        <button
          className={`date-range-btn ${dateRange === 'custom' ? 'active' : ''}`}
          onClick={() => setDateRange('custom')}
        >
          Custom Range
        </button>
      </div>

      {dateRange === 'custom' && (
        <div className="custom-date-inputs">
          <div className="date-input-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={customEndDate || new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="date-input-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
