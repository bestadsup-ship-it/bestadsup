import React from 'react';
import { useNavigate } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';
import '../styles/serviceCard.css';

function ServiceCard({ service }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/services/${service.id}`);
  };

  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="service-card" onClick={handleClick}>
      {service.imageUrl && (
        <div className="service-image">
          <img src={service.imageUrl} alt={service.name} />
        </div>
      )}

      <div className="service-content">
        <div className="service-header">
          <div className="creator-info">
            <img
              src={service.creator?.avatarUrl || '/BestAdsUp.jpg'}
              alt={service.creator?.name}
              className="creator-avatar"
            />
            <div className="creator-details">
              <span className="creator-name">{service.creator?.name || 'Creator'}</span>
              {service.creator?.verificationLevel !== 'none' && (
                <VerificationBadge
                  level={service.creator.verificationLevel}
                  badges={service.creator.verificationBadges || []}
                  size="small"
                  showTooltip={true}
                />
              )}
            </div>
          </div>
        </div>

        <h3 className="service-title">{service.name}</h3>

        {service.tagline && (
          <p className="service-tagline">{service.tagline}</p>
        )}

        <p className="service-description">
          {service.description?.substring(0, 120)}
          {service.description?.length > 120 && '...'}
        </p>

        <div className="service-meta">
          {service.deliveryTimeDays && (
            <span className="meta-item">
              ⏱️ {service.deliveryTimeDays} days delivery
            </span>
          )}
          {service.totalOrders > 0 && (
            <span className="meta-item">
              📦 {service.totalOrders} orders
            </span>
          )}
        </div>

        {service.tags && service.tags.length > 0 && (
          <div className="service-tags">
            {service.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="service-footer">
          <div className="service-rating">
            {service.avgRating ? (
              <>
                <span className="rating-stars">⭐ {service.avgRating.toFixed(1)}</span>
                <span className="rating-count">({service.totalReviews})</span>
              </>
            ) : (
              <span className="rating-new">New Service</span>
            )}
          </div>
          <div className="service-price">
            <span className="price-label">Starting at</span>
            <span className="price-amount">{formatPrice(service.price, service.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceCard;
