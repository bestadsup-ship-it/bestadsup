import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/friends.css';

function Friends() {
  const [activeTab, setActiveTab] = useState('all');
  const [friends] = useState([
    { id: 1, name: 'Marketing Pro', email: 'marketing@example.com', avatar: '/BestAdsUp.jpg', status: 'online' },
    { id: 2, name: 'Sales Team', email: 'sales@example.com', avatar: '/BestAdsUp.jpg', status: 'offline' },
    { id: 3, name: 'Content Creator', email: 'content@example.com', avatar: '/BestAdsUp.jpg', status: 'online' },
  ]);

  const [requests] = useState([
    { id: 1, name: 'New Company', email: 'new@example.com', avatar: '/BestAdsUp.jpg' },
  ]);

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>👤 Friends</h1>
          <p>Connect with other businesses</p>
        </div>

        <div className="friends-tabs">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Friends ({friends.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({requests.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            Suggestions
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="friends-grid">
            {friends.map(friend => (
              <div key={friend.id} className="friend-card">
                <div className="friend-avatar-wrapper">
                  <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                  <span className={`status-indicator ${friend.status}`}></span>
                </div>
                <div className="friend-info">
                  <h3 className="friend-name">{friend.name}</h3>
                  <p className="friend-email">{friend.email}</p>
                </div>
                <div className="friend-actions">
                  <button className="btn-secondary">Message</button>
                  <button className="btn-secondary">View Profile</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="friends-grid">
            {requests.map(request => (
              <div key={request.id} className="friend-card">
                <img src={request.avatar} alt={request.name} className="friend-avatar" />
                <div className="friend-info">
                  <h3 className="friend-name">{request.name}</h3>
                  <p className="friend-email">{request.email}</p>
                </div>
                <div className="friend-actions">
                  <button className="btn-primary">Accept</button>
                  <button className="btn-secondary">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="empty-state">
            <p>No suggestions at the moment</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Friends;
