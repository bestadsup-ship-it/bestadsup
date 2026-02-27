import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import '../styles/activity.css';

function Activity() {
  const [activeTab, setActiveTab] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivities();
  }, [activeTab]);

  const loadActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const filter = activeTab === 'unread' ? 'unread' : 'all';
      const fetchedActivities = await notificationsAPI.getAll(filter);
      setActivities(fetchedActivities);
    } catch (err) {
      console.error('Error loading notifications:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load notifications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      // Update local state
      setActivities(activities.map(a =>
        a.id === notificationId ? { ...a, isRead: true } : a
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setActivities(activities.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

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
          <p>Stay updated with your notifications</p>
        </div>

        <div className="activity-tabs">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({activities.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Unread ({activities.filter(a => !a.isRead).length})
          </button>
          {activities.some(a => !a.isRead) && (
            <button
              className="btn-mark-all-read"
              onClick={handleMarkAllAsRead}
              style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '14px' }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading && <div className="loading">Loading notifications...</div>}

        {!loading && (
          <div className="activity-list">
            {filteredActivities.map(activity => (
              <div
                key={activity.id}
                className={`activity-item ${!activity.isRead ? 'unread' : ''}`}
                onClick={() => !activity.isRead && handleMarkAsRead(activity.id)}
                style={{ cursor: !activity.isRead ? 'pointer' : 'default' }}
              >
                <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                <img src={activity.actor.avatar} alt={activity.actor.name} className="activity-avatar" />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{activity.actor.name}</strong>
                    {activity.actor.isVerified && ' ✓'}
                    {' '}{getActivityAction(activity.type)}
                  </p>
                  {activity.content && (
                    <p className="activity-preview">{activity.content}</p>
                  )}
                  {activity.post && activity.post.content && (
                    <p className="activity-preview">"{activity.post.content.substring(0, 60)}..."</p>
                  )}
                  <span className="activity-time">{formatTimestamp(activity.createdAt)}</span>
                </div>
                {!activity.isRead && <span className="unread-dot"></span>}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredActivities.length === 0 && (
          <div className="empty-state">
            <p>No {activeTab === 'unread' ? 'unread' : ''} notifications</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Activity;
