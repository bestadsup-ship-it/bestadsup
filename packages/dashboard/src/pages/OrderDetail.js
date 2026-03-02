import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI, authAPI, reviewsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import StarRating from '../components/StarRating';
import '../styles/orderDetail.css';
import '../styles/reviews.css';

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, messages, deliverables, timeline
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  // Message form
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Deliverable form
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState({
    title: '',
    description: '',
    file_url: '',
    file_name: '',
  });
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);

  // Revision form
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionDescription, setRevisionDescription] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);

  // Review state
  const [review, setReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review_text: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const user = authAPI.getUser();
  const isBuyer = user?.id === order?.buyer_id;
  const isCreator = user?.id === order?.creator_id;

  useEffect(() => {
    loadOrderData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'messages') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const loadOrderData = async () => {
    setLoading(true);
    setError('');
    try {
      const [orderData, messagesData, deliverablesData, timelineData] = await Promise.all([
        ordersAPI.getById(id),
        ordersAPI.getMessages(id),
        ordersAPI.getDeliverables(id),
        ordersAPI.getTimeline(id),
      ]);
      setOrder(orderData);
      setMessages(messagesData || []);
      setDeliverables(deliverablesData || []);
      setTimeline(timelineData || []);

      // Load review if order is completed
      if (orderData.status === 'completed') {
        loadReview();
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadReview = async () => {
    try {
      const reviewData = await reviewsAPI.getByOrder(id);
      setReview(reviewData);
    } catch (err) {
      // No review yet - that's okay
      setReview(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await ordersAPI.sendMessage(id, newMessage);
      setNewMessage('');
      const messagesData = await ordersAPI.getMessages(id);
      setMessages(messagesData || []);
      setToast({ isVisible: true, type: 'success', message: 'Message sent!' });
    } catch (err) {
      console.error('Error sending message:', err);
      setToast({ isVisible: true, type: 'error', message: 'Failed to send message' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUploadDeliverable = async (e) => {
    e.preventDefault();
    setUploadingDeliverable(true);
    try {
      await ordersAPI.uploadDeliverable(id, deliverableForm);
      setShowDeliverableForm(false);
      setDeliverableForm({ title: '', description: '', file_url: '', file_name: '' });
      const deliverablesData = await ordersAPI.getDeliverables(id);
      setDeliverables(deliverablesData || []);
      setToast({ isVisible: true, type: 'success', message: 'Deliverable uploaded!' });
    } catch (err) {
      console.error('Error uploading deliverable:', err);
      setToast({ isVisible: true, type: 'error', message: 'Failed to upload deliverable' });
    } finally {
      setUploadingDeliverable(false);
    }
  };

  const handleApproveDeliverable = async (deliverableId) => {
    try {
      await ordersAPI.updateDeliverable(id, deliverableId, 'approved');
      const deliverablesData = await ordersAPI.getDeliverables(id);
      setDeliverables(deliverablesData || []);
      setToast({ isVisible: true, type: 'success', message: 'Deliverable approved!' });
    } catch (err) {
      console.error('Error approving deliverable:', err);
      setToast({ isVisible: true, type: 'error', message: 'Failed to approve deliverable' });
    }
  };

  const handleRejectDeliverable = async (deliverableId, reason) => {
    try {
      await ordersAPI.updateDeliverable(id, deliverableId, 'rejected', reason);
      const deliverablesData = await ordersAPI.getDeliverables(id);
      setDeliverables(deliverablesData || []);
      setToast({ isVisible: true, type: 'success', message: 'Deliverable rejected' });
    } catch (err) {
      console.error('Error rejecting deliverable:', err);
      setToast({ isVisible: true, type: 'error', message: 'Failed to reject deliverable' });
    }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (!revisionDescription.trim()) return;

    setRequestingRevision(true);
    try {
      await ordersAPI.requestRevision(id, revisionDescription);
      setShowRevisionForm(false);
      setRevisionDescription('');
      const timelineData = await ordersAPI.getTimeline(id);
      setTimeline(timelineData || []);
      setToast({ isVisible: true, type: 'success', message: 'Revision requested!' });
    } catch (err) {
      console.error('Error requesting revision:', err);
      setToast({ isVisible: true, type: 'error', message: 'Failed to request revision' });
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await ordersAPI.updateStatus(id, newStatus);
      const orderData = await ordersAPI.getById(id);
      setOrder(orderData);
      const timelineData = await ordersAPI.getTimeline(id);
      setTimeline(timelineData || []);
      setToast({ isVisible: true, type: 'success', message: 'Order status updated!' });
    } catch (err) {
      console.error('Error updating status:', err);
      setToast({ isVisible: true, type: 'error', message: 'Failed to update status' });
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating) return;

    setSubmittingReview(true);
    try {
      await reviewsAPI.create({
        order_id: id,
        rating: reviewForm.rating,
        review_text: reviewForm.review_text || null,
      });
      setToast({ isVisible: true, type: 'success', message: 'Review submitted successfully!' });
      setShowReviewForm(false);
      setReviewForm({ rating: 5, review_text: '' });
      loadReview();
    } catch (err) {
      console.error('Error submitting review:', err);
      setToast({
        isVisible: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit review',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  const formatStatus = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending_payment: 'status-pending',
      paid: 'status-paid',
      in_progress: 'status-in-progress',
      delivered: 'status-delivered',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      disputed: 'status-disputed',
      refunded: 'status-refunded',
    };
    return statusClasses[status] || 'status-default';
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>
            Loading order...
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="error-state" style={{ padding: '40px', textAlign: 'center' }}>
            <h3>{error || 'Order not found'}</h3>
            <button className="btn-primary" onClick={() => navigate('/orders')}>
              Back to Orders
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="order-detail-container">
          {/* Header */}
          <div className="order-detail-header">
            <button className="btn-back" onClick={() => navigate('/orders')}>
              ← Back to Orders
            </button>
            <div className="order-title-section">
              <h1>{order.service_name}</h1>
              <span className="order-number">{order.order_number}</span>
            </div>
            <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
              {formatStatus(order.status)}
            </span>
          </div>

          <div className="order-detail-layout">
            {/* Left Column - Main Content */}
            <div className="order-main-content">
              {/* Tabs */}
              <div className="order-tabs">
                <button
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('messages')}
                >
                  Messages ({messages.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'deliverables' ? 'active' : ''}`}
                  onClick={() => setActiveTab('deliverables')}
                >
                  Deliverables ({deliverables.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setActiveTab('timeline')}
                >
                  Timeline
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="overview-tab">
                    <div className="info-section">
                      <h3>Order Details</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Price:</span>
                          <span className="info-value">${order.price.toFixed(2)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Created:</span>
                          <span className="info-value">{formatDate(order.created_at)}</span>
                        </div>
                        {order.expected_delivery_date && (
                          <div className="info-item">
                            <span className="info-label">Expected Delivery:</span>
                            <span className="info-value">{formatDate(order.expected_delivery_date)}</span>
                          </div>
                        )}
                        {order.delivery_time_days && (
                          <div className="info-item">
                            <span className="info-label">Delivery Time:</span>
                            <span className="info-value">{order.delivery_time_days} days</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {order.buyer_requirements && (
                      <div className="info-section">
                        <h3>Requirements</h3>
                        <p className="requirements-text">{order.buyer_requirements}</p>
                      </div>
                    )}

                    {order.service_description && (
                      <div className="info-section">
                        <h3>Service Description</h3>
                        <p className="description-text">{order.service_description}</p>
                      </div>
                    )}

                    {/* Review Section - Only for completed orders */}
                    {order.status === 'completed' && isBuyer && (
                      <div className="info-section">
                        <h3>Review</h3>
                        {review ? (
                          <div className="review-display">
                            <div className="review-rating">
                              <StarRating rating={review.rating} size="medium" />
                            </div>
                            {review.review_text && (
                              <p className="review-text">{review.review_text}</p>
                            )}
                            <p className="review-date">Reviewed on {formatDate(review.created_at)}</p>
                          </div>
                        ) : showReviewForm ? (
                          <form onSubmit={handleSubmitReview} className="review-submission-form">
                            <div className="review-form-field">
                              <label>Rating *</label>
                              <StarRating
                                rating={reviewForm.rating}
                                size="large"
                                readonly={false}
                                onChange={(rating) => setReviewForm({ ...reviewForm, rating })}
                              />
                            </div>
                            <div className="review-form-field">
                              <label>Your Review (Optional)</label>
                              <textarea
                                value={reviewForm.review_text}
                                onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
                                placeholder="Share your experience with this service..."
                                rows={5}
                              />
                            </div>
                            <div className="review-form-actions">
                              <button
                                type="submit"
                                className="btn-primary"
                                disabled={submittingReview || !reviewForm.rating}
                              >
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                              </button>
                              <button
                                type="button"
                                className="btn-text"
                                onClick={() => {
                                  setShowReviewForm(false);
                                  setReviewForm({ rating: 5, review_text: '' });
                                }}
                                disabled={submittingReview}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button className="btn-primary" onClick={() => setShowReviewForm(true)}>
                            Leave a Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (
                  <div className="messages-tab">
                    <div className="messages-list">
                      {messages.length === 0 ? (
                        <div className="empty-messages">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`message ${msg.sender_id === user.id ? 'message-own' : 'message-other'} ${msg.is_system_message ? 'message-system' : ''}`}
                          >
                            {!msg.is_system_message && (
                              <div className="message-sender">
                                {msg.sender_id === order.buyer_id ? 'Buyer' : 'Creator'}
                              </div>
                            )}
                            <div className="message-content">{msg.message}</div>
                            <div className="message-time">{formatDate(msg.created_at)}</div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form className="message-form" onSubmit={handleSendMessage}>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        rows={3}
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={sendingMessage || !newMessage.trim()}
                      >
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Deliverables Tab */}
                {activeTab === 'deliverables' && (
                  <div className="deliverables-tab">
                    {isCreator && !showDeliverableForm && (
                      <button
                        className="btn-primary"
                        onClick={() => setShowDeliverableForm(true)}
                      >
                        + Upload Deliverable
                      </button>
                    )}

                    {showDeliverableForm && (
                      <div className="deliverable-form-card">
                        <h3>Upload Deliverable</h3>
                        <form onSubmit={handleUploadDeliverable}>
                          <div className="form-group">
                            <label>Title *</label>
                            <input
                              type="text"
                              value={deliverableForm.title}
                              onChange={(e) => setDeliverableForm({ ...deliverableForm, title: e.target.value })}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Description</label>
                            <textarea
                              value={deliverableForm.description}
                              onChange={(e) => setDeliverableForm({ ...deliverableForm, description: e.target.value })}
                              rows={3}
                            />
                          </div>
                          <div className="form-group">
                            <label>File URL *</label>
                            <input
                              type="url"
                              value={deliverableForm.file_url}
                              onChange={(e) => setDeliverableForm({ ...deliverableForm, file_url: e.target.value })}
                              placeholder="https://..."
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>File Name *</label>
                            <input
                              type="text"
                              value={deliverableForm.file_name}
                              onChange={(e) => setDeliverableForm({ ...deliverableForm, file_name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={uploadingDeliverable}>
                              {uploadingDeliverable ? 'Uploading...' : 'Upload'}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => {
                                setShowDeliverableForm(false);
                                setDeliverableForm({ title: '', description: '', file_url: '', file_name: '' });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="deliverables-list">
                      {deliverables.length === 0 ? (
                        <div className="empty-deliverables">
                          <p>No deliverables uploaded yet.</p>
                        </div>
                      ) : (
                        deliverables.map(del => (
                          <div key={del.id} className="deliverable-card">
                            <div className="deliverable-header">
                              <h4>{del.title}</h4>
                              <span className={`status-badge ${getStatusBadgeClass(del.status)}`}>
                                {formatStatus(del.status)}
                              </span>
                            </div>
                            {del.description && <p className="deliverable-desc">{del.description}</p>}
                            <div className="deliverable-file">
                              <a href={del.file_url} target="_blank" rel="noopener noreferrer">
                                📎 {del.file_name}
                              </a>
                            </div>
                            <div className="deliverable-meta">
                              Uploaded {formatDate(del.created_at)}
                            </div>
                            {isBuyer && del.status === 'pending_review' && (
                              <div className="deliverable-actions">
                                <button
                                  className="btn-success"
                                  onClick={() => handleApproveDeliverable(del.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-danger"
                                  onClick={() => {
                                    const reason = prompt('Reason for rejection:');
                                    if (reason) handleRejectDeliverable(del.id, reason);
                                  }}
                                >
                                  Request Changes
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                  <div className="timeline-tab">
                    <div className="timeline-list">
                      {timeline.length === 0 ? (
                        <div className="empty-timeline">
                          <p>No activity yet.</p>
                        </div>
                      ) : (
                        timeline.map((event, index) => (
                          <div key={event.id} className="timeline-event">
                            <div className="timeline-marker" />
                            <div className="timeline-content">
                              <h4>{event.event_title}</h4>
                              {event.event_description && <p>{event.event_description}</p>}
                              <span className="timeline-time">{formatDate(event.created_at)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="order-sidebar">
              {/* Actions Card */}
              <div className="sidebar-card">
                <h3>Actions</h3>

                {order.status === 'pending_payment' && isBuyer && (
                  <button className="btn-primary btn-block" onClick={() => navigate(`/payment/${order.id}`)}>
                    Pay Now
                  </button>
                )}

                {order.status === 'paid' && isCreator && (
                  <button className="btn-primary btn-block" onClick={() => handleUpdateStatus('in_progress')}>
                    Start Work
                  </button>
                )}

                {order.status === 'in_progress' && isCreator && (
                  <button className="btn-primary btn-block" onClick={() => handleUpdateStatus('delivered')}>
                    Mark as Delivered
                  </button>
                )}

                {order.status === 'delivered' && isBuyer && (
                  <>
                    <button className="btn-success btn-block" onClick={() => handleUpdateStatus('completed')}>
                      Accept & Complete
                    </button>
                    <button
                      className="btn-secondary btn-block"
                      onClick={() => setShowRevisionForm(!showRevisionForm)}
                    >
                      Request Revision
                    </button>
                  </>
                )}

                {showRevisionForm && (
                  <form onSubmit={handleRequestRevision} style={{ marginTop: '12px' }}>
                    <textarea
                      value={revisionDescription}
                      onChange={(e) => setRevisionDescription(e.target.value)}
                      placeholder="Describe what needs to be changed..."
                      rows={4}
                      required
                    />
                    <div className="form-actions" style={{ marginTop: '8px' }}>
                      <button type="submit" className="btn-primary" disabled={requestingRevision}>
                        {requestingRevision ? 'Submitting...' : 'Submit'}
                      </button>
                      <button
                        type="button"
                        className="btn-text"
                        onClick={() => {
                          setShowRevisionForm(false);
                          setRevisionDescription('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Order Info Card */}
              <div className="sidebar-card">
                <h3>Order Information</h3>
                <div className="sidebar-info">
                  <div className="sidebar-info-item">
                    <span className="info-label">Order ID:</span>
                    <span className="info-value">{order.order_number}</span>
                  </div>
                  <div className="sidebar-info-item">
                    <span className="info-label">{isBuyer ? 'Creator:' : 'Buyer:'}</span>
                    <span className="info-value">
                      {isBuyer ? order.creator?.name : order.buyer?.name}
                    </span>
                  </div>
                  <div className="sidebar-info-item">
                    <span className="info-label">Total:</span>
                    <span className="info-value price">${order.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              {order.status !== 'pending_payment' && (
                <div className="sidebar-card">
                  <h3>Progress</h3>
                  <div className="progress-steps">
                    <div className={`progress-step ${['paid', 'in_progress', 'delivered', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                      ✓ Payment Received
                    </div>
                    <div className={`progress-step ${['in_progress', 'delivered', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                      {order.status === 'in_progress' ? '⏳' : ['delivered', 'completed'].includes(order.status) ? '✓' : '○'} Work in Progress
                    </div>
                    <div className={`progress-step ${['delivered', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                      {order.status === 'delivered' ? '⏳' : order.status === 'completed' ? '✓' : '○'} Delivered
                    </div>
                    <div className={`progress-step ${order.status === 'completed' ? 'completed' : ''}`}>
                      {order.status === 'completed' ? '✓' : '○'} Completed
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </div>
  );
}

export default OrderDetail;
