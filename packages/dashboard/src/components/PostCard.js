import React, { useState } from 'react';
import { postsAPI, followsAPI, savesAPI, authAPI } from '../api/client';
import '../styles/postCard.css';

function PostCard({ post, hideActions = false, onCommentClick, onUpdate, onTagClick }) {
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [following, setFollowing] = useState(post.isFollowingAuthor || false);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [loading, setLoading] = useState(false);

  const currentUser = authAPI.getUser();
  const isOwnPost = currentUser && post.author.email === currentUser.email;

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (liked) {
        const response = await postsAPI.unlike(post.id);
        setLikes(response.likes);
        setLiked(false);
      } else {
        const response = await postsAPI.like(post.id);
        setLikes(response.likes);
        setLiked(true);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (loading || !post.author.id) return;
    setLoading(true);

    try {
      if (following) {
        await followsAPI.unfollow(post.author.id);
        setFollowing(false);
      } else {
        await followsAPI.follow(post.author.id);
        setFollowing(true);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (saved) {
        await savesAPI.unsave(post.id);
        setSaved(false);
      } else {
        await savesAPI.save(post.id);
        setSaved(true);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
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
    <div className="post-card-wrapper">
      <div className="post-card">
        {post.isPromoted && (
          <div className="promoted-badge">
            <span>💰 Promoted</span>
          </div>
        )}

        <div className="post-header">
          <img
            src={post.author.avatar || '/BestAdsUp.jpg'}
            alt={post.author.name}
            className="post-avatar"
          />
          <div className="post-author-info">
            <div className="post-author-name">{post.author.name}</div>
            <div className="post-timestamp">{formatDate(post.createdAt)}</div>
          </div>
        </div>

        <div className="post-content">
          <p>{post.content}</p>
          {post.tags && post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="post-tag"
                  onClick={() => onTagClick && onTagClick(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="post-media-container">
          {post.image && (
            <div className="post-media">
              <img src={post.image} alt="Post content" />
            </div>
          )}

          {post.video && (
            <div className="post-media">
              <video src={post.video} controls preload="metadata" playsInline>
                Your browser does not support the video tag.
              </video>
            </div>
          )}

        </div>

        {post.isPromoted && (
          <div className="post-stats">
            <div className="stat-item">
              <span className="stat-icon">👁️</span>
              <span>{post.impressions || 0} views</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🖱️</span>
              <span>{post.clicks || 0} clicks</span>
            </div>
          </div>
        )}
      </div>

      {!hideActions && (
        <div className="post-actions-sidebar">
          {post.author.id && !isOwnPost && (
            <button
              className={`action-btn-circle follow-action ${following ? 'following' : ''}`}
              onClick={handleFollow}
              title={following ? 'Unfollow' : 'Follow'}
              disabled={loading}
            >
              <img src={post.author.avatar || '/BestAdsUp.jpg'} alt={post.author.name} className="action-avatar-img" />
              {!following && (
                <span className="follow-plus-icon">+</span>
              )}
            </button>
          )}

          <button
            className={`action-btn-circle ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            title={liked ? 'Unlike' : 'Like'}
            disabled={loading}
          >
            <span className="action-icon">{liked ? '❤️' : '🤍'}</span>
            <span className="action-count">{likes > 0 ? likes : 0}</span>
          </button>

          <button
            className="action-btn-circle"
            title="Comment"
            onClick={onCommentClick}
          >
            <span className="action-icon">💬</span>
            <span className="action-count">{post.commentsCount || 0}</span>
          </button>

          <button
            className={`action-btn-circle ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            title={saved ? 'Unsave' : 'Save'}
            disabled={loading}
          >
            <span className="action-icon">{saved ? '🔖' : '📑'}</span>
            <span className="action-count">{post.savesCount || 0}</span>
          </button>

          <button className="action-btn-circle" title="Share">
            <span className="action-icon">➤</span>
            <span className="action-count">0</span>
          </button>

          <img src={post.author.avatar || '/BestAdsUp.jpg'} alt={post.author.name} className="action-avatar-bottom" />
        </div>
      )}
    </div>
  );
}

export default PostCard;
