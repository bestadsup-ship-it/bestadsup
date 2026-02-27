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
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Error loading explore posts:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load posts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingTags = async () => {
    try {
      const tags = await postsAPI.getTrendingTags(15);
      setTrendingTags(tags);
    } catch (err) {
      console.error('Error loading trending tags:', err);
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
          <p>Discover trending content and campaigns</p>
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

        {error && <div className="error-message">{error}</div>}

        {loading && <div className="loading">Loading posts...</div>}

        <div className="explore-content">
          {!loading && !error && posts.length === 0 && (
            <div className="empty-state">
              <p>No posts found for this filter.</p>
            </div>
          )}
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={() => loadPosts(activeTab)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default Explore;
