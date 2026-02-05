import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import '../styles/explore.css';

function Explore() {
  const [activeTab, setActiveTab] = useState('trending');
  const [posts] = useState([
    {
      id: '1',
      author: { name: 'Tech Corp', avatar: '/BestAdsUp.jpg' },
      content: 'Revolutionizing B2B marketing with AI-powered solutions 🚀',
      image: null,
      isPromoted: true,
      impressions: 25000,
      clicks: 1250,
      likes: 450,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      author: { name: 'Marketing Pro', avatar: '/BestAdsUp.jpg' },
      content: 'Check out our latest campaign results! 📊',
      image: null,
      isPromoted: false,
      likes: 89,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>🧭 Explore</h1>
          <p>Discover trending content and campaigns</p>
        </div>

        <div className="explore-tabs">
          <button
            className={`tab-btn ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            🔥 Trending
          </button>
          <button
            className={`tab-btn ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            ⭐ Popular
          </button>
          <button
            className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            🕐 Recent
          </button>
          <button
            className={`tab-btn ${activeTab === 'promoted' ? 'active' : ''}`}
            onClick={() => setActiveTab('promoted')}
          >
            💰 Promoted
          </button>
        </div>

        <div className="explore-content">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default Explore;
