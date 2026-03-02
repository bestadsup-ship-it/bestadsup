import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import VerificationBadge from '../components/VerificationBadge';
import Toast from '../components/Toast';
import ReviewCard from '../components/ReviewCard';
import StarRating from '../components/StarRating';
import { servicesAPI, reviewsAPI } from '../api/client';
import '../styles/serviceDetail.css';
import '../styles/reviews.css';

function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    loadService();
  }, [id]);

  useEffect(() => {
    if (service) {
      loadReviews();
      loadRatingStats();
    }
  }, [service, reviewsPage]);

  const loadService = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await servicesAPI.getById(id);
      setService(data);

      // Set first tier as selected if pricing tiers exist
      if (data.pricingTiers && data.pricingTiers.length > 0) {
        setSelectedTier(0);
      }
    } catch (err) {
      console.error('Error loading service:', err);
      setError('Failed to load service. It may not exist or you may not have permission to view it.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const data = await reviewsAPI.getByProduct(id, reviewsPage, 5);
      setReviews(data);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadRatingStats = async () => {
    try {
      const stats = await reviewsAPI.getProductStats(id);
      setRatingStats(stats);
    } catch (err) {
      console.error('Error loading rating stats:', err);
    }
  };

  const handleOrderNow = () => {
    // Navigate to checkout with service and tier info
    navigate('/checkout', {
      state: {
        serviceId: service.id,
        selectedTier: selectedTier !== null && service.pricingTiers
          ? service.pricingTiers[selectedTier]
          : null,
      },
    });
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>
            Loading service...
          </div>
        </main>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="error-state" style={{ padding: '40px', textAlign: 'center' }}>
            <h3>{error || 'Service not found'}</h3>
            <button className="btn-primary" onClick={() => navigate('/shop')}>
              Back to Marketplace
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentPrice = selectedTier !== null && service.pricingTiers
    ? service.pricingTiers[selectedTier].price
    : service.price;

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="service-detail-container">
          {/* Header */}
          <div className="service-detail-header">
            <button className="btn-back" onClick={() => navigate('/shop')}>
              ← Back to Marketplace
            </button>

            <div className="service-detail-title">
              <h1>{service.name}</h1>
              {service.tagline && <p className="service-tagline-large">{service.tagline}</p>}
            </div>

            <div className="creator-info-large">
              <img
                src={service.creator?.avatarUrl || '/BestAdsUp.jpg'}
                alt={service.creator?.name}
                className="creator-avatar-large"
              />
              <div className="creator-details-large">
                <span className="creator-name-large">{service.creator?.name || 'Creator'}</span>
                {service.creator?.verificationLevel !== 'none' && (
                  <VerificationBadge
                    level={service.creator.verificationLevel}
                    badges={service.creator.verificationBadges || []}
                    size="medium"
                    showTooltip={true}
                  />
                )}
                {service.creator?.bio && (
                  <p className="creator-bio">{service.creator.bio}</p>
                )}
              </div>
            </div>
          </div>

          <div className="service-detail-content">
            {/* Main Content */}
            <div className="service-detail-main">
              {/* Service Image */}
              {service.imageUrl && (
                <div className="service-image-large">
                  <img src={service.imageUrl} alt={service.name} />
                </div>
              )}

              {/* Description */}
              <section className="service-section">
                <h2>About This Service</h2>
                <p className="service-description-large">{service.description}</p>
              </section>

              {/* What You'll Get */}
              {service.whatYouGet && service.whatYouGet.length > 0 && (
                <section className="service-section">
                  <h2>What You'll Get</h2>
                  <ul className="service-list">
                    {service.whatYouGet.map((item, index) => (
                      <li key={index}>✓ {item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* What's Included */}
              {service.includes && service.includes.length > 0 && (
                <section className="service-section">
                  <h2>What's Included</h2>
                  <ul className="service-list">
                    {service.includes.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Ideal For */}
              {service.idealFor && service.idealFor.length > 0 && (
                <section className="service-section">
                  <h2>Ideal For</h2>
                  <div className="ideal-for-tags">
                    {service.idealFor.map((item, index) => (
                      <span key={index} className="ideal-for-tag">{item}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Portfolio */}
              {service.portfolioItems && service.portfolioItems.length > 0 && (
                <section className="service-section">
                  <h2>Portfolio & Case Studies</h2>
                  <div className="portfolio-grid">
                    {service.portfolioItems.map((item, index) => (
                      <div key={index} className="portfolio-item-card">
                        {item.imageUrl && (
                          <div className="portfolio-image">
                            <img src={item.imageUrl} alt={item.title} />
                          </div>
                        )}
                        <div className="portfolio-content">
                          <h3>{item.title}</h3>
                          {item.description && <p>{item.description}</p>}
                          {item.results && (
                            <div className="portfolio-results">
                              <strong>Results:</strong> {item.results}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {service.requirements && (
                <section className="service-section">
                  <h2>Requirements from You</h2>
                  <p className="service-requirements">{service.requirements}</p>
                </section>
              )}

              {/* FAQs */}
              {service.faqs && service.faqs.length > 0 && (
                <section className="service-section">
                  <h2>Frequently Asked Questions</h2>
                  <div className="faqs-list">
                    {service.faqs.map((faq, index) => (
                      <div key={index} className="faq-item">
                        <h4>{faq.question}</h4>
                        <p>{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <section className="service-section">
                  <h2>Tags</h2>
                  <div className="service-tags-list">
                    {service.tags.map((tag, index) => (
                      <span key={index} className="service-tag">{tag}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews & Ratings Section */}
              <section className="service-section">
                <h2>Reviews & Ratings</h2>

                {/* Rating Stats */}
                {ratingStats && ratingStats.total_reviews > 0 ? (
                  <div className="rating-stats-container" style={{ marginBottom: '32px' }}>
                    <div className="rating-stats-header">
                      <div className="rating-average">{ratingStats.average_rating}</div>
                      <div className="rating-average-label">
                        <StarRating rating={parseFloat(ratingStats.average_rating)} size="large" />
                      </div>
                      <div className="rating-total-reviews">
                        Based on {ratingStats.total_reviews} {ratingStats.total_reviews === 1 ? 'review' : 'reviews'}
                      </div>
                    </div>

                    {ratingStats.rating_distribution && (
                      <div className="rating-distribution">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratingStats.rating_distribution[star.toString()] || 0;
                          const percentage = ratingStats.total_reviews > 0
                            ? (count / ratingStats.total_reviews) * 100
                            : 0;
                          return (
                            <div key={star} className="rating-distribution-row">
                              <div className="rating-distribution-label">{star} stars</div>
                              <div className="rating-distribution-bar">
                                <div
                                  className="rating-distribution-bar-fill"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="rating-distribution-count">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    No reviews yet. Be the first to review this service!
                  </div>
                )}

                {/* Reviews List */}
                {reviews.reviews && reviews.reviews.length > 0 && (
                  <div className="reviews-list">
                    {reviews.reviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        isCreator={false}
                      />
                    ))}

                    {/* Pagination */}
                    {reviews.pagination && reviews.pagination.totalPages > 1 && (
                      <div className="reviews-pagination">
                        <button
                          onClick={() => setReviewsPage(reviewsPage - 1)}
                          disabled={reviewsPage === 1 || reviewsLoading}
                        >
                          Previous
                        </button>
                        <span>
                          Page {reviewsPage} of {reviews.pagination.totalPages}
                        </span>
                        <button
                          onClick={() => setReviewsPage(reviewsPage + 1)}
                          disabled={reviewsPage === reviews.pagination.totalPages || reviewsLoading}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="service-detail-sidebar">
              {/* Pricing Card */}
              <div className="pricing-card">
                {/* Pricing Tiers */}
                {service.pricingTiers && service.pricingTiers.length > 0 ? (
                  <>
                    <h3>Choose a Package</h3>
                    <div className="pricing-tiers">
                      {service.pricingTiers.map((tier, index) => (
                        <div
                          key={index}
                          className={`tier-option ${selectedTier === index ? 'selected' : ''}`}
                          onClick={() => setSelectedTier(index)}
                        >
                          <div className="tier-header-option">
                            <span className="tier-name">{tier.name}</span>
                            <span className="tier-price">{formatPrice(tier.price, service.currency)}</span>
                          </div>
                          {tier.description && (
                            <p className="tier-description">{tier.description}</p>
                          )}
                          {tier.deliverables && tier.deliverables.length > 0 && (
                            <ul className="tier-deliverables">
                              {tier.deliverables.map((deliverable, i) => (
                                <li key={i}>✓ {deliverable}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="price-display">
                      <span className="price-label">Starting at</span>
                      <span className="price-amount-large">{formatPrice(service.price, service.currency)}</span>
                    </div>
                  </>
                )}

                <button
                  className="btn-primary btn-large"
                  onClick={handleOrderNow}
                  disabled={service.slotsAvailable === 0}
                >
                  {service.slotsAvailable === 0 ? 'Fully Booked' : 'Order Now'}
                </button>

                {/* Service Meta */}
                <div className="service-meta-sidebar">
                  {service.deliveryTimeDays && (
                    <div className="meta-row">
                      <span className="meta-label">⏱️ Delivery Time</span>
                      <span className="meta-value">{service.deliveryTimeDays} days</span>
                    </div>
                  )}
                  {service.revisionsIncluded !== undefined && service.revisionsIncluded !== null && (
                    <div className="meta-row">
                      <span className="meta-label">🔄 Revisions</span>
                      <span className="meta-value">
                        {service.revisionsIncluded === 0 ? 'None' : service.revisionsIncluded}
                      </span>
                    </div>
                  )}
                  {service.slotsAvailable !== undefined && service.slotsAvailable !== null && (
                    <div className="meta-row">
                      <span className="meta-label">📅 Slots Available</span>
                      <span className="meta-value">
                        {service.slotsAvailable === 0 ? 'Fully booked' : service.slotsAvailable}
                      </span>
                    </div>
                  )}
                  {service.totalOrders > 0 && (
                    <div className="meta-row">
                      <span className="meta-label">📦 Orders Completed</span>
                      <span className="meta-value">{service.totalOrders}</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                {service.avgRating && (
                  <div className="service-rating-sidebar">
                    <div className="rating-display">
                      <span className="rating-stars-large">⭐ {service.avgRating.toFixed(1)}</span>
                      <span className="rating-count-large">({service.totalReviews} reviews)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Creator Verification Card */}
              {service.creator?.verificationBadges && service.creator.verificationBadges.length > 0 && (
                <div className="verification-card">
                  <h3>Verified Credentials</h3>
                  <div className="badges-list">
                    {service.creator.verificationBadges.map((badge, index) => (
                      <div key={index} className="badge-item">
                        <VerificationBadge
                          level={badge.level}
                          badges={[badge]}
                          size="small"
                          showTooltip={false}
                        />
                        <div className="badge-info">
                          <span className="badge-type">{badge.type}</span>
                          <span className="badge-level">{badge.level} verified</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
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

export default ServiceDetail;
