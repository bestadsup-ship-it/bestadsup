import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { authAPI, postsAPI, followsAPI, savesAPI, profileAPI } from '../api/client';
import '../styles/profile.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatarUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, myPosts, following, followers] = await Promise.all([
        profileAPI.getMyProfile(),
        postsAPI.getMyPosts(),
        followsAPI.getFollowing(),
        followsAPI.getFollowers(),
      ]);
      setProfile(profileData);
      setPosts(myPosts);
      setFollowingCount(following.length);
      setFollowersCount(followers.length);
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadLikedPosts = async () => {
    try {
      const liked = await postsAPI.getLiked();
      setLikedPosts(liked);
    } catch (err) {
      console.error('Error loading liked posts:', err);
    }
  };

  const loadSavedPosts = async () => {
    try {
      const saved = await savesAPI.getSaved();
      setSavedPosts(saved);
    } catch (err) {
      console.error('Error loading saved posts:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'likes' && likedPosts.length === 0) {
      loadLikedPosts();
    }
    if (activeTab === 'saved' && savedPosts.length === 0) {
      loadSavedPosts();
    }
  }, [activeTab]);

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

  const handleEditProfile = async () => {
    try {
      const profile = await profileAPI.getMyProfile();
      setEditForm({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatar_url || '',
      });
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploadingImage(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm({ ...editForm, avatarUrl: reader.result });
      setUploadingImage(false);
    };
    reader.onerror = () => {
      alert('Failed to read image file');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedProfile = await profileAPI.updateProfile(editForm);
      setProfile(updatedProfile);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
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
              src={profile?.avatar_url || '/BestAdsUp.jpg'}
              alt="Profile"
              className="profile-avatar"
            />
            <div className="profile-details">
              <h1 className="profile-name">{profile?.name || profile?.email || 'User'}</h1>
              <p className="profile-handle">@{profile?.username || profile?.email?.split('@')[0] || 'user'}</p>
              <p className="profile-bio">
                {profile?.bio || 'B2B Marketing Professional | Growing brands through strategic advertising'}
              </p>
              <div className="profile-stats">
                <div className="stat">
                  <strong>{followingCount}</strong>
                  <span>Following</span>
                </div>
                <div className="stat">
                  <strong>{followersCount}</strong>
                  <span>Followers</span>
                </div>
                <div className="stat">
                  <strong>{posts.length}</strong>
                  <span>Posts</span>
                </div>
              </div>
            </div>
            <button className="btn-primary edit-profile-btn" onClick={handleEditProfile}>Edit Profile</button>
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
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            🔖 Saved
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
                <div className="posts-list">
                  {likedPosts.length === 0 ? (
                    <div className="empty-state">
                      <p>No liked posts yet</p>
                    </div>
                  ) : (
                    likedPosts.map(post => (
                      <PostCard key={post.id} post={post} hideActions={true} />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="posts-list">
                  {savedPosts.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔖</div>
                      <p>No saved posts yet</p>
                    </div>
                  ) : (
                    savedPosts.map(post => (
                      <PostCard key={post.id} post={post} hideActions={true} onUpdate={loadSavedPosts} />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveProfile} className="edit-profile-form">
              <div className="form-group">
                <label>Profile Picture</label>
                <div className="avatar-upload-section">
                  <img
                    src={editForm.avatarUrl || '/BestAdsUp.jpg'}
                    alt="Profile"
                    className="avatar-preview"
                  />
                  <div className="avatar-upload-controls">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="avatar-upload" className="btn-upload">
                      {uploadingImage ? 'Uploading...' : 'Change Picture'}
                    </label>
                    {editForm.avatarUrl && editForm.avatarUrl !== '/BestAdsUp.jpg' && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => setEditForm({ ...editForm, avatarUrl: '' })}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  rows="4"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
