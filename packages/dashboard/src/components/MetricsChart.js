import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function MetricsChart({ data }) {
  // Transform data for Recharts
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    impressions: item.impressions || 0,
    clicks: item.clicks || 0,
    revenue: parseFloat((item.revenue || 0).toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="date" stroke="#666" />
        <YAxis yAxisId="left" stroke="#666" />
        <YAxis yAxisId="right" orientation="right" stroke="#666" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="impressions"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={{ fill: '#4f46e5', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="clicks"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default MetricsChart;
