import React, { useState } from 'react';
import '../styles/verificationBadge.css';

/**
 * VerificationBadge Component
 *
 * Displays verification status badges for creators
 * Shows trust signals from third-party integrations (GA4, HubSpot, Stripe)
 *
 * Props:
 * - level: 'none' | 'partial' | 'verified'
 * - badges: array of badge objects { type, level, verifiedAt }
 * - size: 'small' | 'medium' | 'large'
 * - showTooltip: boolean
 */
function VerificationBadge({ level = 'none', badges = [], size = 'medium', showTooltip = true }) {
  const [showDetails, setShowDetails] = useState(false);

  // Badge type configurations
  const badgeConfig = {
    ga4_verified: {
      icon: '📊',
      name: 'Google Analytics',
      color: '#4285F4',
      description: 'Verified traffic & conversion data from Google Analytics 4'
    },
    hubspot_verified: {
      icon: '🎯',
      name: 'HubSpot',
      color: '#FF7A59',
      description: 'Verified lead generation & CRM data from HubSpot'
    },
    stripe_verified: {
      icon: '💳',
      name: 'Stripe',
      color: '#635BFF',
      description: 'Verified revenue data from Stripe payments'
    },
    manual_verified: {
      icon: '✓',
      name: 'Manual Review',
      color: '#10B981',
      description: 'Manually verified by BestAdsUp team'
    }
  };

  // Get badge icon and color based on verification level
  const getLevelBadge = () => {
    switch (level) {
      case 'verified':
        return { icon: '✓', text: 'Verified', color: '#10B981', bgColor: '#D1FAE5' };
      case 'partial':
        return { icon: '⚡', text: 'Partially Verified', color: '#F59E0B', bgColor: '#FEF3C7' };
      default:
        return null;
    }
  };

  const levelBadge = getLevelBadge();

  if (level === 'none' && badges.length === 0) {
    return null;
  }

  return (
    <div className={`verification-badge-container ${size}`}>
      {/* Main verification level badge */}
      {levelBadge && (
        <div
          className="verification-level-badge"
          style={{
            backgroundColor: levelBadge.bgColor,
            color: levelBadge.color,
            cursor: showTooltip ? 'pointer' : 'default'
          }}
          onMouseEnter={() => showTooltip && setShowDetails(true)}
          onMouseLeave={() => showTooltip && setShowDetails(false)}
          onClick={() => showTooltip && setShowDetails(!showDetails)}
        >
          <span className="badge-icon">{levelBadge.icon}</span>
          <span className="badge-text">{levelBadge.text}</span>
        </div>
      )}

      {/* Individual service badges */}
      {badges.length > 0 && (
        <div className="service-badges">
          {badges.map((badge, index) => {
            const config = badgeConfig[badge.type] || badgeConfig.manual_verified;
            return (
              <div
                key={index}
                className={`service-badge ${badge.level}`}
                style={{ borderColor: config.color }}
                title={showTooltip ? config.description : ''}
              >
                <span className="service-icon">{config.icon}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip with details */}
      {showTooltip && showDetails && badges.length > 0 && (
        <div className="verification-tooltip">
          <div className="tooltip-header">
            <h4>Verification Details</h4>
            <button
              className="tooltip-close"
              onClick={() => setShowDetails(false)}
            >
              ×
            </button>
          </div>
          <div className="tooltip-content">
            {badges.map((badge, index) => {
              const config = badgeConfig[badge.type] || badgeConfig.manual_verified;
              const verifiedDate = badge.verifiedAt ? new Date(badge.verifiedAt).toLocaleDateString() : 'Recently';

              return (
                <div key={index} className="verification-item">
                  <div className="verification-item-header">
                    <span className="verification-icon" style={{ color: config.color }}>
                      {config.icon}
                    </span>
                    <span className="verification-name">{config.name}</span>
                    <span className={`verification-level-tag ${badge.level}`}>
                      {badge.level === 'verified' ? '✓ Verified' : '⚡ Partial'}
                    </span>
                  </div>
                  <p className="verification-description">{config.description}</p>
                  <p className="verification-date">Verified on {verifiedDate}</p>
                </div>
              );
            })}
          </div>
          <div className="tooltip-footer">
            <p className="tooltip-note">
              All data is verified through secure third-party API connections
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * VerificationScore Component
 * Displays a numerical trust score (0-100) based on verification quantity/quality
 */
export function VerificationScore({ score = 0, showLabel = true }) {
  const getScoreColor = () => {
    if (score >= 80) return '#10B981'; // Green - Excellent
    if (score >= 60) return '#3B82F6'; // Blue - Good
    if (score >= 40) return '#F59E0B'; // Orange - Fair
    return '#9CA3AF'; // Gray - Low
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Highly Trusted';
    if (score >= 60) return 'Trusted';
    if (score >= 40) return 'Verified';
    return 'New Creator';
  };

  return (
    <div className="verification-score">
      <div className="score-ring" style={{ borderColor: getScoreColor() }}>
        <span className="score-value" style={{ color: getScoreColor() }}>
          {score}
        </span>
      </div>
      {showLabel && (
        <span className="score-label" style={{ color: getScoreColor() }}>
          {getScoreLabel()}
        </span>
      )}
    </div>
  );
}

/**
 * VerifiedMetricCard Component
 * Displays a single verified metric with source badge
 */
export function VerifiedMetricCard({ metric }) {
  const sourceIcons = {
    ga4: '📊',
    hubspot: '🎯',
    stripe: '💳',
    manual: '✓'
  };

  const icon = sourceIcons[metric.dataSource] || '✓';

  return (
    <div className="verified-metric-card">
      <div className="metric-header">
        <span className="metric-source-icon">{icon}</span>
        <span className="metric-name">{metric.metricName}</span>
        {metric.isVerified && <span className="verified-check">✓</span>}
      </div>
      <div className="metric-value">
        {metric.metricValue.toLocaleString()}
        {metric.metricUnit && <span className="metric-unit">{metric.metricUnit}</span>}
      </div>
      {metric.timePeriod && (
        <div className="metric-period">{metric.timePeriod}</div>
      )}
      {metric.verificationProofUrl && (
        <a
          href={metric.verificationProofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="metric-proof-link"
        >
          View Proof →
        </a>
      )}
    </div>
  );
}

export default VerificationBadge;
