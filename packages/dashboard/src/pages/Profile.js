import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { authAPI, postsAPI } from '../api/client';
import '../styles/profile.css';

function Profile() {
  const user = authAPI.getUser();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await postsAPI.getMyPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (postId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === postId ? null : postId);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter(p => p.id !== postId));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="profile-header">
          <div className="profile-cover"></div>
          <div className="profile-info">
            <img
              src="/BestAdsUp.jpg"
              alt="Profile"
              className="profile-avatar"
            />
            <div className="profile-details">
              <h1 className="profile-name">{user?.email || 'User'}</h1>
              <p className="profile-handle">@{user?.email?.split('@')[0] || 'user'}</p>
              <p className="profile-bio">
                B2B Marketing Professional | Growing brands through strategic advertising
              </p>
              <div className="profile-stats">
                <div className="stat">
                  <strong>0</strong>
                  <span>Following</span>
                </div>
                <div className="stat">
                  <strong>0</strong>
                  <span>Followers</span>
                </div>
                <div className="stat">
                  <strong>{posts.length}</strong>
                  <span>Posts</span>
                </div>
              </div>
            </div>
            <button className="btn-primary edit-profile-btn">Edit Profile</button>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`tab-btn ${activeTab === 'promoted' ? 'active' : ''}`}
            onClick={() => setActiveTab('promoted')}
          >
            Promoted
          </button>
          <button
            className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            Likes
          </button>
        </div>

        <div className="profile-content">
          {loading ? (
            <div className="loading">Loading posts...</div>
          ) : (
            <>
              {activeTab === 'posts' && (
                <div className="posts-list">
                  {posts.length === 0 ? (
                    <div className="empty-state">
                      <p>No posts yet. Start creating content!</p>
                    </div>
                  ) : (
                    posts.map(post => (
                      <div key={post.id} className="post-with-actions">
                        <PostCard post={post} hideActions={true} />
                        <button
                          className="post-menu-btn"
                          onClick={(e) => toggleMenu(post.id, e)}
                          title="Post options"
                        >
                          ⋮
                        </button>
                        {openMenuId === post.id && (
                          <div className="post-context-menu">
                            <button
                              className="menu-item delete"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              🗑️ Delete Post
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'promoted' && (
                <div className="posts-list">
                  {posts.filter(p => p.isPromoted).length === 0 ? (
                    <div className="empty-state">
                      <p>No promoted posts yet</p>
                    </div>
                  ) : (
                    posts.filter(p => p.isPromoted).map(post => (
                      <div key={post.id} className="post-with-actions">
                        <PostCard post={post} hideActions={true} />
                        <button
                          className="post-menu-btn"
                          onClick={(e) => toggleMenu(post.id, e)}
                          title="Post options"
                        >
                          ⋮
                        </button>
                        {openMenuId === post.id && (
                          <div className="post-context-menu">
                            <button
                              className="menu-item delete"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              🗑️ Delete Post
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'likes' && (
                <div className="empty-state">
                  <p>No liked posts yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Profile;
