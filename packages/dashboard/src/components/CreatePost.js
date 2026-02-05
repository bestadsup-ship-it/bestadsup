import React, { useState } from 'react';
import { postsAPI } from '../api/client';
import '../styles/createPost.css';

function CreatePost({ onPostCreated, onCancel }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isPromoted, setIsPromoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    setLoading(true);

    try {
      const postData = {
        content: content.trim(),
        imageUrl: imagePreview,
        isPromoted,
      };

      const newPost = await postsAPI.create(postData);
      onPostCreated(newPost);
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-form">
      <div className="create-post-header">
        <h2>Create Post</h2>
        <button onClick={onCancel} className="close-btn" disabled={loading}>
          ×
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <textarea
          className="post-textarea"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          disabled={loading}
          autoFocus
        />

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Preview" />
            <button
              type="button"
              className="remove-image-btn"
              onClick={() => {
                setImage(null);
                setImagePreview(null);
              }}
              disabled={loading}
            >
              ×
            </button>
          </div>
        )}

        <div className="post-options">
          <label className="file-upload-btn">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
              hidden
            />
            📷 Add Photo
          </label>

          <label className="promote-checkbox">
            <input
              type="checkbox"
              checked={isPromoted}
              onChange={(e) => setIsPromoted(e.target.checked)}
              disabled={loading}
            />
            <span>Promote this post (paid ad)</span>
          </label>
        </div>

        <div className="post-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePost;
