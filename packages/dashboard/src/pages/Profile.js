import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import VerificationBadge from '../components/VerificationBadge';
import { authAPI, postsAPI, profileAPI } from '../api/client';
import '../styles/profile.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
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
      const [profileData, myPosts] = await Promise.all([
        profileAPI.getMyProfile(),
        postsAPI.getMyPosts(),
      ]);
      setProfile(profileData);
      setPosts(myPosts);
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
            <div className="profile-avatar-wrapper">
              <img
                src={profile?.avatar_url || '/BestAdsUp.jpg'}
                alt="Profile"
                className="profile-avatar"
              />
              {profile?.isVerified && (
                <span className="verification-badge" title="Verified Creator">✓</span>
              )}
            </div>
            <div className="profile-details">
              <div className="profile-name-row">
                <h1 className="profile-name">{profile?.name || profile?.email?.split('@')[0] || 'User'}</h1>
                {profile?.accountType && (
                  <span className={`account-type-badge ${profile.accountType}`}>
                    {profile.accountType === 'creator' && '🎨 Creator'}
                    {profile.accountType === 'buyer' && '🛍️ Buyer'}
                    {profile.accountType === 'hybrid' && '⚡ Creator + Buyer'}
                  </span>
                )}
                {profile?.verificationLevel && profile.verificationLevel !== 'none' && (
                  <VerificationBadge
                    level={profile.verificationLevel}
                    badges={profile.verificationBadges || []}
                    size="medium"
                    showTooltip={true}
                  />
                )}
              </div>

              <p className="profile-bio">
                {profile?.bio || 'Welcome to your marketplace profile'}
              </p>

              {/* Verification Level */}
              {profile?.verificationLevel && profile.verificationLevel !== 'none' && (
                <div className="verification-status">
                  <span className={`verification-badge ${profile.verificationLevel}`}>
                    {profile.verificationLevel === 'verified' && '✓ Verified'}
                    {profile.verificationLevel === 'partial' && '⚡ Partially Verified'}
                  </span>
                  {profile.hasVerifiedResults && (
                    <span className="verified-results-badge">📊 Verified Results</span>
                  )}
                </div>
              )}

              <div className="profile-stats">
                <div className="stat">
                  <strong>{posts.length}</strong>
                  <span>Portfolio Items</span>
                </div>
                {profile?.servicesCount > 0 && (
                  <div className="stat">
                    <strong>{profile.servicesCount}</strong>
                    <span>Services</span>
                  </div>
                )}
                {profile?.completedProjectsCount > 0 && (
                  <div className="stat">
                    <strong>{profile.completedProjectsCount}</strong>
                    <span>Completed Projects</span>
                  </div>
                )}
                {profile?.verifiedMetricsCount > 0 && (
                  <div className="stat">
                    <strong>{profile.verifiedMetricsCount}</strong>
                    <span>Verified Metrics</span>
                  </div>
                )}
                {profile?.verificationBadgesCount > 0 && (
                  <div className="stat">
                    <strong>{profile.verificationBadgesCount}</strong>
                    <span>Verification Badges</span>
                  </div>
                )}
              </div>
            </div>
            <div className="profile-actions">
              <button className="btn-primary edit-profile-btn" onClick={handleEditProfile}>Edit Profile</button>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Portfolio
          </button>
        </div>

        <div className="profile-content">
          {loading ? (
            <div className="loading">Loading portfolio...</div>
          ) : (
            <div className="posts-list">
              {posts.length === 0 ? (
                <div className="empty-state">
                  <p>No portfolio items yet. Start showcasing your work!</p>
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
