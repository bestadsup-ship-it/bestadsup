import React, { useState, useEffect } from 'react';
import { followsAPI, accountsAPI } from '../api/client';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../styles/friends.css';

function Friends() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('following');
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [followingData, followersData, suggestionsData] = await Promise.all([
        followsAPI.getFollowing(),
        followsAPI.getFollowers(),
        accountsAPI.getSuggested(10),
      ]);
      setFollowing(followingData);
      setFollowers(followersData);
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error('Error loading friends data:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (accountId) => {
    try {
      await followsAPI.follow(accountId);
      loadData();
    } catch (err) {
      console.error('Error following account:', err);
      alert('Failed to follow account. Please try again.');
    }
  };

  const handleUnfollow = async (accountId) => {
    try {
      await followsAPI.unfollow(accountId);
      loadData();
    } catch (err) {
      console.error('Error unfollowing account:', err);
      alert('Failed to unfollow account. Please try again.');
    }
  };

  const handleMessage = (accountId) => {
    navigate('/messages');
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>👤 Friends</h1>
          <p>Connect with other businesses</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="friends-tabs">
          <button
            className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Following ({following.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            Followers ({followers.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            Suggestions ({suggestions.length})
          </button>
        </div>

        {loading ? (
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : (
          <>
            {activeTab === 'following' && (
              <div className="friends-grid">
                {following.length === 0 ? (
                  <div className="empty-state">
                    <p>You're not following anyone yet. Check out suggestions!</p>
                  </div>
                ) : (
                  following.map(account => (
                    <div key={account.id} className="friend-card">
                      <div className="friend-avatar-wrapper">
                        <img src={account.avatar} alt={account.name} className="friend-avatar" />
                      </div>
                      <div className="friend-info">
                        <h3 className="friend-name">
                          {account.name}
                          {account.isVerified && ' ✓'}
                        </h3>
                        <p className="friend-email">{account.username || account.email}</p>
                        {account.bio && <p style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>{account.bio}</p>}
                      </div>
                      <div className="friend-actions">
                        <button className="btn-secondary" onClick={() => handleMessage(account.id)}>Message</button>
                        <button className="btn-secondary" onClick={() => handleUnfollow(account.id)}>Unfollow</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'followers' && (
              <div className="friends-grid">
                {followers.length === 0 ? (
                  <div className="empty-state">
                    <p>No followers yet. Keep posting great content!</p>
                  </div>
                ) : (
                  followers.map(account => (
                    <div key={account.id} className="friend-card">
                      <div className="friend-avatar-wrapper">
                        <img src={account.avatar} alt={account.name} className="friend-avatar" />
                      </div>
                      <div className="friend-info">
                        <h3 className="friend-name">
                          {account.name}
                          {account.isVerified && ' ✓'}
                        </h3>
                        <p className="friend-email">{account.username || account.email}</p>
                        {account.bio && <p style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>{account.bio}</p>}
                      </div>
                      <div className="friend-actions">
                        <button className="btn-secondary" onClick={() => handleMessage(account.id)}>Message</button>
                        {account.isFollowingBack ? (
                          <button className="btn-secondary" onClick={() => handleUnfollow(account.id)}>Unfollow</button>
                        ) : (
                          <button className="btn-primary" onClick={() => handleFollow(account.id)}>Follow Back</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="friends-grid">
                {suggestions.length === 0 ? (
                  <div className="empty-state">
                    <p>No suggestions at the moment</p>
                  </div>
                ) : (
                  suggestions.map(account => (
                    <div key={account.id} className="friend-card">
                      <div className="friend-avatar-wrapper">
                        <img src={account.avatar} alt={account.name} className="friend-avatar" />
                      </div>
                      <div className="friend-info">
                        <h3 className="friend-name">
                          {account.name}
                          {account.isVerified && ' ✓'}
                        </h3>
                        <p className="friend-email">{account.username || account.email}</p>
                        <p style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                          {account.followersCount} followers · {account.postsCount} posts
                        </p>
                      </div>
                      <div className="friend-actions">
                        <button className="btn-primary" onClick={() => handleFollow(account.id)}>Follow</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Friends;
