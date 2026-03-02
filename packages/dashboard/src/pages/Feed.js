import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [showComments, setShowComments] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const user = authAPI.getUser();

  // Check URL for tag parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagParam = params.get('tag');
    if (tagParam) {
      setSelectedTag(tagParam);
    } else {
      setSelectedTag(null);
    }
  }, [location.search]);

  useEffect(() => {
    loadPosts();
    loadUnreadCount();

    // Poll for new posts and notifications every 5 seconds (without showing loading indicator)
    const interval = setInterval(() => {
      loadPosts(false);
      loadUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedTag]);

  const loadPosts = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    setError(''); // Clear any previous errors
    try {
      const fetchedPosts = selectedTag
        ? await postsAPI.getByTag(selectedTag)
        : await postsAPI.getAll();
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load posts. Please try again.');
      }
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

  const loadUnreadCount = async () => {
    try {
      const data = await notificationsAPI.getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll('all', 20, 0);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleNotificationClick = () => {
    if (!showNotifications) {
      loadNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const handleOpenComments = async (post) => {
    setActivePost(post);
    setShowComments(true);

    // Load real comments from API
    try {
      const fetchedComments = await commentsAPI.getForPost(post.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    }
  };

  const handleCloseComments = () => {
    setShowComments(false);
    setNewComment('');
    setTimeout(() => {
      setActivePost(null);
      setComments([]);
    }, 300); // Wait for animation
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !activePost) return;

    try {
      const newCommentData = await commentsAPI.create(activePost.id, {
        content: newComment
      });
      setComments([...comments, newCommentData]);
      setNewComment('');
      // Refresh posts to update comment count
      loadPosts(false);
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    }
  };

  const handleCommentLike = async (commentId, isLiked) => {
    try {
      if (isLiked) {
        await commentsAPI.unlike(commentId);
      } else {
        await commentsAPI.like(commentId);
      }
      // Update comment in local state
      setComments(comments.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !isLiked,
              likesCount: isLiked ? comment.likesCount - 1 : comment.likesCount + 1
            }
          : comment
      ));
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const formatCommentTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
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
          <button className="notifications-btn" onClick={handleNotificationClick}>
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
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
          {selectedTag && (
            <div className="tag-filter-banner">
              <span>Filtered by: <strong>{selectedTag}</strong></span>
              <button
                className="clear-filter-btn"
                onClick={() => setSelectedTag(null)}
              >
                ✕ Clear filter
              </button>
            </div>
          )}

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
              <PostCard
                key={post.id}
                post={post}
                onCommentClick={() => handleOpenComments(post)}
                onUpdate={() => loadPosts(false)}
                onTagClick={(tag) => setSelectedTag(tag.replace(/^#/, ''))}
              />
            ))}
          </div>

          {!loading && !error && posts.length === 0 && selectedTag && (
            <div className="empty-state">
              <p>No posts found with tag #{selectedTag}</p>
              <button className="btn-primary" onClick={() => {
                setSelectedTag(null);
                navigate('/');
              }}>View All Posts</button>
            </div>
          )}

          {!loading && !error && posts.length === 0 && !selectedTag && (
            <div className="empty-state">
              <p>No posts yet. Create your first post to get started!</p>
            </div>
          )}
        </div>
      </main>

      {/* Comments Pop-out Panel */}
      {showComments && (
        <>
          <div
            className={`comments-overlay ${showComments ? 'visible' : ''}`}
            onClick={handleCloseComments}
          />
          <div className={`comments-panel ${showComments ? 'open' : ''}`}>
            <div className="comments-panel-header">
              <h3>Comments</h3>
              <button className="close-comments-btn" onClick={handleCloseComments}>
                ✕
              </button>
            </div>
            <div className="comments-panel-content">
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <img src={comment.author.avatar} alt={comment.author.name} className="comment-avatar" />
                    <div className="comment-body">
                      <div className="comment-author">{comment.author.name}</div>
                      <div className="comment-text">{comment.content}</div>
                      <div className="comment-meta">
                        <span>{formatCommentTime(comment.createdAt)}</span>
                        <button
                          className={comment.isLiked ? 'liked' : ''}
                          onClick={() => handleCommentLike(comment.id, comment.isLiked)}
                        >
                          {comment.isLiked ? '❤️' : '🤍'} {comment.likesCount > 0 ? comment.likesCount : ''}
                        </button>
                        <button>Reply</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="comments-panel-footer">
              <input
                type="text"
                className="comment-input"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
              />
              <button
                className="send-comment-btn"
                onClick={handlePostComment}
                disabled={!newComment.trim()}
              >
                ➤
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          <div
            className="notifications-overlay"
            onClick={() => setShowNotifications(false)}
          />
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="notifications-content">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  >
                    {notification.actor && (
                      <img
                        src={notification.actor.avatar}
                        alt={notification.actor.name}
                        className="notification-avatar"
                      />
                    )}
                    <div className="notification-body">
                      <div className="notification-text">
                        {notification.actor && (
                          <strong>{notification.actor.name}</strong>
                        )}{' '}
                        {notification.type === 'comment' && 'commented on your post'}
                        {notification.type === 'like' && 'liked your post'}
                        {notification.type === 'follow' && 'started following you'}
                        {notification.type === 'reply' && 'replied to your comment'}
                      </div>
                      {notification.message && (
                        <div className="notification-message">
                          {notification.message}
                        </div>
                      )}
                      <div className="notification-time">
                        {formatCommentTime(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Feed;
