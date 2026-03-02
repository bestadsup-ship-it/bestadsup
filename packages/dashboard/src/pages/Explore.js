import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import '../styles/explore.css';

function Explore() {
  const [activeTab, setActiveTab] = useState('trending');
  const [posts, setPosts] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPosts(activeTab);
    loadTrendingTags();
  }, [activeTab]);

  const loadPosts = async (filter) => {
    setLoading(true);
    setError('');
    try {
      const fetchedPosts = await postsAPI.getExplore(filter);
      setPosts(fetchedPosts || []);
    } catch (err) {
      console.error('Error loading explore posts:', err);
      // Gracefully handle errors - show empty state
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingTags = async () => {
    try {
      const tags = await postsAPI.getTrendingTags(15);
      setTrendingTags(tags || []);
    } catch (err) {
      console.error('Error loading trending tags:', err);
      setTrendingTags([]);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleTagClick = (tag) => {
    navigate(`/?tag=${encodeURIComponent(tag.name.replace(/^#/, ''))}`);
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>🧭 Explore</h1>
          <p>Discover top SaaS marketing creators & proven strategies</p>
        </div>

        {trendingTags.length > 0 && (
          <div className="trending-tags-section">
            <h3>🔥 Trending Tags</h3>
            <div className="trending-tags-grid">
              {trendingTags.map((tag, index) => (
                <div
                  key={tag.id}
                  className="trending-tag-card"
                  onClick={() => handleTagClick(tag)}
                >
                  <div className="trending-tag-rank">#{index + 1}</div>
                  <div className="trending-tag-name">{tag.name}</div>
                  <div className="trending-tag-count">{tag.postCount} posts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="explore-tabs">
          <button
            className={`tab-btn ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => handleTabChange('trending')}
          >
            🔥 Trending
          </button>
          <button
            className={`tab-btn ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => handleTabChange('popular')}
          >
            ⭐ Popular
          </button>
          <button
            className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => handleTabChange('recent')}
          >
            🕐 Recent
          </button>
          <button
            className={`tab-btn ${activeTab === 'promoted' ? 'active' : ''}`}
            onClick={() => handleTabChange('promoted')}
          >
            💰 Promoted
          </button>
        </div>

        {loading && <div className="loading">Loading posts...</div>}

        <div className="explore-content">
          {!loading && posts.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
              <h3 style={{ marginBottom: '8px' }}>No posts yet</h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                {activeTab === 'trending' && 'No trending posts right now. Check back soon!'}
                {activeTab === 'popular' && 'No popular posts yet. Be the first to create!'}
                {activeTab === 'recent' && 'No recent posts. Start sharing your SaaS marketing wins!'}
                {activeTab === 'promoted' && 'No promoted posts currently.'}
              </p>
              <button
                className="btn-primary"
                onClick={() => window.location.href = '/upload'}
              >
                Post Your Work
              </button>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={() => loadPosts(activeTab)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Explore;
