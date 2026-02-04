import React from 'react';
import '../styles/components.css';

function MetricCard({ title, value, subtitle }) {
  return (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-value">{value}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}

export default MetricCard;
