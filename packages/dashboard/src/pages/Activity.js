import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/activity.css';

function Activity() {
  const [activeTab, setActiveTab] = useState('all');
  const [activities] = useState([
    {
      id: 1,
      type: 'like',
      user: 'Marketing Pro',
      avatar: '/BestAdsUp.jpg',
      action: 'liked your post',
      content: '"Check out our latest campaign..."',
      timestamp: '2m ago',
      read: false,
    },
    {
      id: 2,
      type: 'comment',
      user: 'Sales Team',
      avatar: '/BestAdsUp.jpg',
      action: 'commented on your post',
      content: 'Great insights!',
      timestamp: '15m ago',
      read: false,
    },
    {
      id: 3,
      type: 'follow',
      user: 'Content Creator',
      avatar: '/BestAdsUp.jpg',
      action: 'started following you',
      timestamp: '1h ago',
      read: true,
    },
    {
      id: 4,
      type: 'mention',
      user: 'Tech Corp',
      avatar: '/BestAdsUp.jpg',
      action: 'mentioned you in a comment',
      content: '@you check this out!',
      timestamp: '2h ago',
      read: true,
    },
  ]);

  const getActivityIcon = (type) => {
    const icons = {
      like: '❤️',
      comment: '💬',
      follow: '👥',
      mention: '@',
    };
    return icons[type] || '🔔';
  };

  const filteredActivities = activeTab === 'all'
    ? activities
    : activities.filter(a => !a.read);

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
            Unread ({activities.filter(a => !a.read).length})
          </button>
        </div>

        <div className="activity-list">
          {filteredActivities.map(activity => (
            <div key={activity.id} className={`activity-item ${!activity.read ? 'unread' : ''}`}>
              <div className="activity-icon">{getActivityIcon(activity.type)}</div>
              <img src={activity.avatar} alt={activity.user} className="activity-avatar" />
              <div className="activity-content">
                <p className="activity-text">
                  <strong>{activity.user}</strong> {activity.action}
                </p>
                {activity.content && (
                  <p className="activity-preview">{activity.content}</p>
                )}
                <span className="activity-time">{activity.timestamp}</span>
              </div>
              {!activity.read && <span className="unread-dot"></span>}
            </div>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="empty-state">
            <p>No {activeTab === 'unread' ? 'unread' : ''} notifications</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Activity;
