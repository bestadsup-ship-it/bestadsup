import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, postsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import '../styles/feed.css';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const user = authAPI.getUser();

  useEffect(() => {
    loadPosts();

    // Poll for new posts every 5 seconds (without showing loading indicator)
    const interval = setInterval(() => {
      loadPosts(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadPosts = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    try {
      const fetchedPosts = await postsAPI.getAll();
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setShowCreatePost(false);
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  return (
    <div className="feed-container">
      <Sidebar />
      <header className="feed-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src="/BestAdsUp.jpg"
              alt="BestAdsUp Logo"
              style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            />
            <h1>BestAdsUp</h1>
          </div>
        </div>
        <div className="header-right">
          <div className="user-menu-container">
            <button
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <img
                src="/BestAdsUp.jpg"
                alt="Profile"
                className="user-avatar-small"
              />
              <span className="user-email">{user?.email || 'User'}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            {showUserMenu && (
              <div className="user-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                >
                  👤 Profile
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/dashboard');
                  }}
                >
                  📊 Analytics
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item logout"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="feed-main">
        <div className="feed-content">
          <div className="create-post-trigger">
            <img
              src="/BestAdsUp.jpg"
              alt="Your avatar"
              className="avatar"
            />
            <button
              onClick={() => setShowCreatePost(true)}
              className="create-post-btn"
            >
              What's on your mind?
            </button>
          </div>

          {showCreatePost && (
            <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <CreatePost
                  onPostCreated={handlePostCreated}
                  onCancel={() => setShowCreatePost(false)}
                />
              </div>
            </div>
          )}

          {loading && <div className="loading">Loading posts...</div>}

          <div className="posts-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {!loading && posts.length === 0 && (
            <div className="empty-state">
              <p>No posts yet. Create your first post to get started!</p>
            </div>
          )}
        </div>

        <aside className="feed-sidebar">
          <div className="sidebar-card">
            <h3>Your Stats</h3>
            <div className="stat-item">
              <span className="stat-label">Total Posts</span>
              <span className="stat-value">{posts.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Promoted</span>
              <span className="stat-value">
                {posts.filter(p => p.isPromoted).length}
              </span>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Tips</h3>
            <ul className="tips-list">
              <li>Add images to get 2x more engagement</li>
              <li>Promote posts to reach more audience</li>
              <li>Check Analytics for detailed insights</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default Feed;
