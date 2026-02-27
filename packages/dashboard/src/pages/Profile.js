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
  const [creatorForm, setCreatorForm] = useState({
    tagline: '',
    specialties: [],
    industriesServed: [],
    yearsExperience: 0,
    hourlyRate: 0,
    availabilityStatus: 'available',
    responseTime: '',
    certifications: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);

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

  const handleEditCreatorProfile = async () => {
    try {
      const profile = await profileAPI.getMyProfile();
      if (profile.creatorProfile) {
        setCreatorForm({
          tagline: profile.creatorProfile.tagline || '',
          specialties: profile.creatorProfile.specialties || [],
          industriesServed: profile.creatorProfile.industriesServed || [],
          yearsExperience: profile.creatorProfile.yearsExperience || 0,
          hourlyRate: profile.creatorProfile.hourlyRate || 0,
          availabilityStatus: profile.creatorProfile.availabilityStatus || 'available',
          responseTime: profile.creatorProfile.responseTime || '',
          certifications: profile.creatorProfile.certifications || [],
        });
      }
      setShowCreatorModal(true);
    } catch (err) {
      console.error('Error loading creator profile:', err);
    }
  };

  const handleSaveCreatorProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await profileAPI.updateCreatorProfile(creatorForm);
      await loadData(); // Reload profile data
      setShowCreatorModal(false);
    } catch (err) {
      console.error('Error saving creator profile:', err);
      alert('Failed to save creator profile. Please try again.');
    } finally {
      setSaving(false);
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
                <h1 className="profile-name">{profile?.name || profile?.email || 'User'}</h1>
                {profile?.accountType && (
                  <span className={`account-type-badge ${profile.accountType}`}>
                    {profile.accountType === 'creator' && '🎨 Creator'}
                    {profile.accountType === 'buyer' && '🛍️ Buyer'}
                    {profile.accountType === 'hybrid' && '⚡ Creator + Buyer'}
                  </span>
                )}
              </div>

              {profile?.creatorProfile?.tagline && (
                <p className="profile-tagline">{profile.creatorProfile.tagline}</p>
              )}

              <p className="profile-bio">
                {profile?.bio || 'B2B Marketing Professional | Growing brands through strategic advertising'}
              </p>

              {profile?.creatorProfile && (
                <div className="creator-highlights">
                  {profile.creatorProfile.specialties?.length > 0 && (
                    <div className="specialties">
                      {profile.creatorProfile.specialties.slice(0, 3).map((specialty, i) => (
                        <span key={i} className="specialty-tag">{specialty}</span>
                      ))}
                    </div>
                  )}

                  <div className="creator-quick-stats">
                    {profile.creatorProfile.avgRating > 0 && (
                      <span className="quick-stat">
                        ⭐ {profile.creatorProfile.avgRating.toFixed(1)} ({profile.creatorProfile.totalReviews} reviews)
                      </span>
                    )}
                    {profile.creatorProfile.totalSales > 0 && (
                      <span className="quick-stat">
                        📦 {profile.creatorProfile.totalSales} sales
                      </span>
                    )}
                    {profile.creatorProfile.responseTime && (
                      <span className="quick-stat">
                        ⚡ {profile.creatorProfile.responseTime}
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                {profile?.creatorProfile?.totalServices > 0 && (
                  <div className="stat">
                    <strong>{profile.creatorProfile.totalServices}</strong>
                    <span>Services</span>
                  </div>
                )}
              </div>
            </div>
            <div className="profile-actions">
              <button className="btn-primary edit-profile-btn" onClick={handleEditProfile}>Edit Profile</button>
              {(profile?.accountType === 'creator' || profile?.accountType === 'hybrid') && (
                <button className="btn-secondary edit-profile-btn" onClick={handleEditCreatorProfile}>
                  Edit Creator Info
                </button>
              )}
            </div>
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

      {showCreatorModal && (
        <div className="modal-overlay" onClick={() => setShowCreatorModal(false)}>
          <div className="modal-content creator-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Creator Profile</h2>
              <button className="modal-close" onClick={() => setShowCreatorModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCreatorProfile} className="edit-profile-form">
              <div className="form-group">
                <label htmlFor="tagline">Professional Tagline</label>
                <input
                  type="text"
                  id="tagline"
                  value={creatorForm.tagline}
                  onChange={(e) => setCreatorForm({ ...creatorForm, tagline: e.target.value })}
                  placeholder="e.g., B2B SaaS Marketing Specialist | 50+ Campaigns Launched"
                  maxLength="255"
                />
              </div>

              <div className="form-group">
                <label htmlFor="specialties">Specialties (comma-separated)</label>
                <input
                  type="text"
                  id="specialties"
                  value={creatorForm.specialties.join(', ')}
                  onChange={(e) => setCreatorForm({
                    ...creatorForm,
                    specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Content Marketing, Paid Ads, SEO"
                />
              </div>

              <div className="form-group">
                <label htmlFor="industries">Industries Served (comma-separated)</label>
                <input
                  type="text"
                  id="industries"
                  value={creatorForm.industriesServed.join(', ')}
                  onChange={(e) => setCreatorForm({
                    ...creatorForm,
                    industriesServed: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="SaaS, FinTech, Healthcare"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="yearsExperience">Years of Experience</label>
                  <input
                    type="number"
                    id="yearsExperience"
                    value={creatorForm.yearsExperience}
                    onChange={(e) => setCreatorForm({ ...creatorForm, yearsExperience: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hourlyRate">Hourly Rate ($)</label>
                  <input
                    type="number"
                    id="hourlyRate"
                    value={creatorForm.hourlyRate}
                    onChange={(e) => setCreatorForm({ ...creatorForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="availability">Availability Status</label>
                  <select
                    id="availability"
                    value={creatorForm.availabilityStatus}
                    onChange={(e) => setCreatorForm({ ...creatorForm, availabilityStatus: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="not_accepting">Not Accepting Projects</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="responseTime">Response Time</label>
                  <input
                    type="text"
                    id="responseTime"
                    value={creatorForm.responseTime}
                    onChange={(e) => setCreatorForm({ ...creatorForm, responseTime: e.target.value })}
                    placeholder="e.g., within 24 hours"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="certifications">Certifications (comma-separated)</label>
                <input
                  type="text"
                  id="certifications"
                  value={creatorForm.certifications.join(', ')}
                  onChange={(e) => setCreatorForm({
                    ...creatorForm,
                    certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Google Ads Certified, HubSpot Inbound"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreatorModal(false)}>
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
