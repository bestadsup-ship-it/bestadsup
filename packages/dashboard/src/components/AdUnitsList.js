import React from 'react';
import '../styles/components.css';

function AdUnitsList({ adUnits, formatNumber, formatCurrency, formatPercentage }) {
  if (!adUnits || adUnits.length === 0) {
    return <div className="empty-state">No ad units found</div>;
  }

  return (
    <div className="ad-units-table-container">
      <table className="ad-units-table">
        <thead>
          <tr>
            <th>Ad Unit</th>
            <th>Impressions</th>
            <th>Clicks</th>
            <th>CTR</th>
            <th>Revenue</th>
            <th>eCPM</th>
            <th>Fill Rate</th>
          </tr>
        </thead>
        <tbody>
          {adUnits.map((unit) => {
            const ctr =
              unit.impressions > 0 ? (unit.clicks / unit.impressions) * 100 : 0;
            const ecpm =
              unit.impressions > 0 ? (unit.revenue / unit.impressions) * 1000 : 0;

            return (
              <tr key={unit.adUnitId || unit.id}>
                <td className="ad-unit-name">
                  <div className="ad-unit-info">
                    <strong>{unit.name || unit.adUnitName || 'Unknown'}</strong>
                    {unit.format && <span className="ad-unit-format">{unit.format}</span>}
                  </div>
                </td>
                <td>{formatNumber(unit.impressions || 0)}</td>
                <td>{formatNumber(unit.clicks || 0)}</td>
                <td>{formatPercentage(ctr)}</td>
                <td>{formatCurrency(unit.revenue || 0)}</td>
                <td>{formatCurrency(ecpm)}</td>
                <td>{formatPercentage(unit.fillRate || 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AdUnitsList;
