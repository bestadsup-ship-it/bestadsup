import React, { useState } from 'react';
import '../styles/postCard.css';

function PostCard({ post, hideActions = false }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
      setLiked(false);
    } else {
      setLikes(likes + 1);
      setLiked(true);
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

        {!hideActions && (post.image || post.video) && (
          <div className="post-actions-sidebar">
            <button
              className={`action-btn-circle ${liked ? 'liked' : ''}`}
              onClick={handleLike}
              title="Like"
            >
              <span className="action-icon">{liked ? '❤️' : '🤍'}</span>
              <span className="action-count">{likes > 0 ? likes : ''}</span>
            </button>
            <button className="action-btn-circle" title="Comment">
              <span className="action-icon">💬</span>
              <span className="action-count">2598</span>
            </button>
            <button className="action-btn-circle" title="Share">
              <span className="action-icon">🔗</span>
              <span className="action-count">12.1K</span>
            </button>
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

      {!hideActions && !post.image && !post.video && (
        <div className="post-actions">
          <button
            className={`action-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span className="action-icon">{liked ? '❤️' : '🤍'}</span>
            <span>{likes > 0 && likes}</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">💬</span>
            <span>Comment</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">🔗</span>
            <span>Share</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default PostCard;
