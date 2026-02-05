import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { postsAPI } from '../api/client';
import '../styles/upload.css';

function Upload() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isPromoted, setIsPromoted] = useState(false);
  const [budget, setBudget] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (selectedFile.type.startsWith('image/')) {
          setFilePreview({ type: 'image', url: reader.result });
        } else if (selectedFile.type.startsWith('video/')) {
          setFilePreview({ type: 'video', url: reader.result });
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type.startsWith('video/'))) {
      processFile(droppedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      const postData = {
        content,
        imageUrl: filePreview?.type === 'image' ? filePreview.url : undefined,
        videoUrl: filePreview?.type === 'video' ? filePreview.url : undefined,
        isPromoted,
        budget: budget ? parseFloat(budget) : undefined,
        targetAudience: targetAudience || undefined,
      };

      await postsAPI.create(postData);

      // Reset form
      setContent('');
      setFile(null);
      setFilePreview(null);
      setIsPromoted(false);
      setBudget('');
      setTargetAudience('');

      // Redirect to feed
      navigate('/');
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>➕ Upload</h1>
          <p>Create and publish your content</p>
        </div>

        <div className="upload-container">
          <form onSubmit={handleSubmit} className="upload-form">
            {error && <div className="error-message">{error}</div>}

            <div className="upload-section">
              <h3>Content</h3>
              <textarea
                className="upload-textarea"
                placeholder="What do you want to share?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="upload-section">
              <h3>Media</h3>
              <div
                className="file-upload-area"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {filePreview ? (
                  <div className="file-preview">
                    {filePreview.type === 'image' && (
                      <img src={filePreview.url} alt="Preview" />
                    )}
                    {filePreview.type === 'video' && (
                      <video src={filePreview.url} controls />
                    )}
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => {
                        setFile(null);
                        setFilePreview(null);
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <label
                    className="file-upload-label"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      hidden
                    />
                    <div className="upload-icon">📁</div>
                    <p>Click to upload or drag and drop</p>
                    <span>Images and videos supported</span>
                  </label>
                )}
              </div>
            </div>

            <div className="upload-section">
              <h3>Promotion Settings</h3>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPromoted}
                  onChange={(e) => setIsPromoted(e.target.checked)}
                />
                <span>Promote this post (paid advertising)</span>
              </label>

              {isPromoted && (
                <div className="promotion-options">
                  <div className="form-group">
                    <label>Budget ($)</label>
                    <input
                      type="number"
                      placeholder="100.00"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    >
                      <option value="">Select audience</option>
                      <option value="tech">Tech Industry</option>
                      <option value="marketing">Marketing Professionals</option>
                      <option value="sales">Sales Teams</option>
                      <option value="all">All Businesses</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="upload-actions">
              <button type="button" className="btn-secondary">
                Save Draft
              </button>
              <button type="submit" className="btn-primary" disabled={uploading}>
                {uploading ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>

          <aside className="upload-tips">
            <div className="tips-card">
              <h3>📝 Tips for Better Posts</h3>
              <ul>
                <li>Keep your message clear and concise</li>
                <li>Use high-quality images or videos</li>
                <li>Add relevant hashtags</li>
                <li>Engage with your audience</li>
                <li>Post consistently</li>
              </ul>
            </div>

            <div className="tips-card">
              <h3>💡 Promotion Benefits</h3>
              <ul>
                <li>Reach larger audience</li>
                <li>Target specific industries</li>
                <li>Track detailed analytics</li>
                <li>Boost engagement rates</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Upload;
