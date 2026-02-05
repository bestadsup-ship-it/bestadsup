import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import '../styles/following.css';

function Following() {
  const [posts] = useState([
    {
      id: '1',
      author: { name: 'Company You Follow', avatar: '/BestAdsUp.jpg' },
      content: 'Latest update from our B2B solutions team!',
      image: null,
      isPromoted: false,
      likes: 34,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ]);

  const [suggestedAccounts] = useState([
    { id: 1, name: 'Marketing Leaders', followers: '45K', avatar: '/BestAdsUp.jpg' },
    { id: 2, name: 'B2B Growth', followers: '32K', avatar: '/BestAdsUp.jpg' },
    { id: 3, name: 'Sales Pro', followers: '28K', avatar: '/BestAdsUp.jpg' },
  ]);

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>👥 Following</h1>
          <p>Content from accounts you follow</p>
        </div>

        <div className="following-layout">
          <div className="following-feed">
            {posts.length > 0 ? (
              posts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="empty-state">
                <p>Follow accounts to see their posts here</p>
                <button className="btn-primary">Explore Accounts</button>
              </div>
            )}
          </div>

          <aside className="suggestions-sidebar">
            <div className="sidebar-card">
              <h3>Suggested for you</h3>
              <div className="suggested-list">
                {suggestedAccounts.map(account => (
                  <div key={account.id} className="suggested-item">
                    <img src={account.avatar} alt={account.name} className="suggested-avatar" />
                    <div className="suggested-info">
                      <div className="suggested-name">{account.name}</div>
                      <div className="suggested-followers">{account.followers} followers</div>
                    </div>
                    <button className="btn-follow">Follow</button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Following;
