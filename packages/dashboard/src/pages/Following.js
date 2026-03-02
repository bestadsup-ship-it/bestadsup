import React, { useState, useEffect } from 'react';
import { postsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import '../styles/following.css';

function Following() {
  const [posts, setPosts] = useState([]);
  const [suggestedAccounts, setSuggestedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    loadPosts();
    loadSuggestions();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedPosts = await postsAPI.getFollowing();
      setPosts(fetchedPosts || []);
    } catch (err) {
      console.error('Error loading following posts:', err);
      // Gracefully handle errors - show empty state instead
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const fetchedAccounts = await accountsAPI.getSuggested(5);
      setSuggestedAccounts(fetchedAccounts || []);
    } catch (err) {
      console.error('Error loading suggested accounts:', err);
      // Gracefully handle errors
      setSuggestedAccounts([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleFollow = async (accountId) => {
    try {
      await followsAPI.follow(accountId);
      setFollowingIds(new Set([...followingIds, accountId]));
      // Reload suggestions to get fresh accounts
      loadSuggestions();
      // Reload posts in case new content is available
      loadPosts();
    } catch (err) {
      console.error('Error following account:', err);
      alert('Failed to follow account. Please try again.');
    }
  };

  const formatFollowerCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>👥 Following</h1>
          <p>Posts from SaaS marketers you follow</p>
        </div>

        <div className="following-layout">
          <div className="following-feed">
            {loading && <div className="loading">Loading posts...</div>}

            {!loading && posts.length > 0 ? (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={loadPosts}
                />
              ))
            ) : !loading ? (
              <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <h3 style={{ marginBottom: '8px' }}>No posts yet</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Follow SaaS marketing creators to see their content here
                </p>
                <button className="btn-primary" onClick={() => window.location.href = '/explore'}>
                  Discover Creators
                </button>
              </div>
            ) : null}
          </div>

          <aside className="suggestions-sidebar">
            <div className="sidebar-card">
              <h3>SaaS Marketing Creators</h3>
              {suggestionsLoading ? (
                <div className="loading-suggestions">Loading...</div>
              ) : (
                <div className="suggested-list">
                  {suggestedAccounts.length > 0 ? (
                    suggestedAccounts.map(account => (
                      <div key={account.id} className="suggested-item">
                        <img src={account.avatar} alt={account.name} className="suggested-avatar" />
                        <div className="suggested-info">
                          <div className="suggested-name">
                            {account.name}
                            {account.isVerified && ' ✓'}
                          </div>
                          <div className="suggested-followers">
                            {formatFollowerCount(account.followersCount)} followers
                          </div>
                        </div>
                        <button
                          className="btn-follow"
                          onClick={() => handleFollow(account.id)}
                          disabled={followingIds.has(account.id)}
                        >
                          {followingIds.has(account.id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                      No suggestions available
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Following;
