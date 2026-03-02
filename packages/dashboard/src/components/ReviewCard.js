import React, { useState } from 'react';
import StarRating from './StarRating';
import { reviewsAPI } from '../api/client';
import Toast from './Toast';

const ReviewCard = ({ review, isCreator = false, onResponseAdded = null }) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAddResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;

    setSubmitting(true);
    try {
      await reviewsAPI.addResponse(review.id, responseText);
      setToast({
        isVisible: true,
        type: 'success',
        message: 'Response added successfully!',
      });
      setShowResponseForm(false);
      setResponseText('');
      if (onResponseAdded) {
        onResponseAdded();
      }
    } catch (error) {
      setToast({
        isVisible: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to add response',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-author">
          {review.buyer_avatar ? (
            <img src={review.buyer_avatar} alt={review.buyer_name} className="review-avatar" />
          ) : (
            <div className="review-avatar-placeholder">{review.buyer_name?.charAt(0).toUpperCase()}</div>
          )}
          <div className="review-author-info">
            <div className="review-author-name">{review.buyer_name}</div>
            <div className="review-date">{formatDate(review.created_at)}</div>
          </div>
        </div>
        <div className="review-rating">
          <StarRating rating={review.rating} size="small" />
        </div>
      </div>

      {review.review_text && <div className="review-text">{review.review_text}</div>}

      {review.order_number && (
        <div className="review-order-ref">Order #{review.order_number}</div>
      )}

      {review.product_name && (
        <div className="review-product-ref">Service: {review.product_name}</div>
      )}

      {/* Creator Response */}
      {review.creator_response && (
        <div className="creator-response">
          <div className="creator-response-label">Creator Response:</div>
          <div className="creator-response-text">{review.creator_response}</div>
          <div className="creator-response-date">{formatDate(review.creator_response_at)}</div>
        </div>
      )}

      {/* Add Response Button (for creators) */}
      {isCreator && !review.creator_response && (
        <div className="review-actions">
          {!showResponseForm ? (
            <button className="btn-text" onClick={() => setShowResponseForm(true)}>
              Respond to Review
            </button>
          ) : (
            <form onSubmit={handleAddResponse} className="response-form">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                className="response-textarea"
                rows="3"
                disabled={submitting}
              />
              <div className="response-form-actions">
                <button type="submit" className="btn-primary btn-sm" disabled={submitting || !responseText.trim()}>
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </button>
                <button
                  type="button"
                  className="btn-text btn-sm"
                  onClick={() => {
                    setShowResponseForm(false);
                    setResponseText('');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
    </div>
  );
};

export default ReviewCard;
