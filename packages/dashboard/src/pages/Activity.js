import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/activity.css';

function Activity() {
  const [activeTab, setActiveTab] = useState('all');
  const activities = []; // Notifications will be reimplemented for project updates in Sprint 2

  const getActivityIcon = (type) => {
    const icons = {
      like: '❤️',
      comment: '💬',
      follow: '👥',
      mention: '@',
      reply: '↩️',
    };
    return icons[type] || '🔔';
  };

  const getActivityAction = (type) => {
    const actions = {
      like: 'liked your post',
      comment: 'commented on your post',
      follow: 'started following you',
      mention: 'mentioned you in a comment',
      reply: 'replied to your comment',
    };
    return actions[type] || 'interacted with you';
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifTime.toLocaleDateString();
  };

  const filteredActivities = activities;

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>🔔 Activity</h1>
          <p>Stay updated on likes, comments, and follows</p>
        </div>

        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <h3 style={{ marginBottom: '8px' }}>Notifications Coming Soon</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Project updates and notifications will be available in Sprint 2
          </p>
        </div>
      </main>
    </div>
  );
}

export default Activity;
