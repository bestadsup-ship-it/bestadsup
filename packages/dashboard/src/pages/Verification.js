import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import VerificationBadge, { VerificationScore, VerifiedMetricCard } from '../components/VerificationBadge';
import { authAPI, verificationAPI } from '../api/client';
import '../styles/verification.css';

function Verification() {
  const [activeTab, setActiveTab] = useState('overview');
  const [verificationStats, setVerificationStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState(null);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthServiceName, setOauthServiceName] = useState('');
  const [showAlreadyConnectedModal, setShowAlreadyConnectedModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [serviceToDisconnect, setServiceToDisconnect] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  const user = authAPI.getUser();

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  useEffect(() => {
    loadVerificationData();
  }, []);

  const loadVerificationData = async () => {
    setLoading(true);
    try {
      const [statsData, badgesData, metricsData, connectionsData, requestsData] = await Promise.all([
        verificationAPI.getStats(),
        verificationAPI.getBadges(),
        verificationAPI.getMetrics(false), // Get all metrics, not just verified
        verificationAPI.getConnections(),
        verificationAPI.getRequests(),
      ]);

      setVerificationStats(statsData || {});
      setBadges(Array.isArray(badgesData) ? badgesData : []);
      setMetrics(Array.isArray(metricsData) ? metricsData : []);
      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error) {
      console.error('Error loading verification data:', error);
      // Set empty defaults on error
      setVerificationStats({
        verificationLevel: 'none',
        verificationScore: 0,
        hasVerifiedResults: false,
        badgesCount: { verified: 0, partial: 0 },
        verifiedMetricsCount: 0,
      });
      setBadges([]);
      setMetrics([]);
      setConnections([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = (type) => {
    setSelectedRequestType(type);
    setShowRequestModal(true);
  };

  const handleConnectService = (serviceName) => {
    setOauthServiceName(serviceName);
    setShowOAuthModal(true);
  };

  const initiateOAuthFlow = async () => {
    try {
      const response = await verificationAPI.initiateOAuth(oauthServiceName);
      setShowOAuthModal(false);

      // Check if we got a real OAuth URL or demo mode
      if (response.mode === 'oauth' && response.authorizationUrl) {
        // Real OAuth - redirect to provider
        window.location.href = response.authorizationUrl;
      } else {
        // Demo mode - show placeholder connection created
        setToast({
          isVisible: true,
          type: 'success',
          message: `Demo: Connected to ${oauthServiceName} (OAuth credentials not configured)`
        });
        loadVerificationData();
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      setShowOAuthModal(false);
      setToast({ isVisible: true, type: 'error', message: 'Failed to connect service. Please try again.' });
    }
  };

  const handleDisconnectService = (serviceName) => {
    setServiceToDisconnect(serviceName);
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    try {
      await verificationAPI.disconnectService(serviceToDisconnect);
      setShowDisconnectModal(false);
      setServiceToDisconnect(null);
      setToast({ isVisible: true, type: 'success', message: 'Service disconnected successfully!' });
      // Reload verification data after disconnect
      loadVerificationData();
    } catch (error) {
      console.error('Error disconnecting service:', error);
      setShowDisconnectModal(false);
      setServiceToDisconnect(null);
      setToast({ isVisible: true, type: 'error', message: 'Failed to disconnect service. Please try again.' });
    }
  };

  const verificationOptions = [
    {
      type: 'ga4',
      icon: '📊',
      name: 'Google Analytics',
      description: 'Verify traffic growth, conversion rates, and user engagement metrics',
      color: '#4285F4',
    },
    {
      type: 'hubspot',
      icon: '🎯',
      name: 'HubSpot',
      description: 'Verify lead generation, email campaign performance, and CRM data',
      color: '#FF7A59',
    },
    {
      type: 'stripe',
      icon: '💳',
      name: 'Stripe',
      description: 'Verify revenue growth, transaction volume, and payment data',
      color: '#635BFF',
    },
    {
      type: 'manual',
      icon: '📸',
      name: 'Manual Upload',
      description: 'Submit screenshots and documentation for manual review',
      color: '#6B7280',
    },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading">Loading verification data...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <div>
            <h1>🔐 Verification Center</h1>
            <p>Build trust with verified performance data</p>
          </div>
          {verificationStats && (
            <VerificationScore
              score={verificationStats.verificationScore}
              showLabel={true}
            />
          )}
        </div>

        {/* Verification tabs */}
        <div className="verification-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            Verified Metrics ({metrics.filter(m => m.isVerified).length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            Connections
          </button>
          <button
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({requests.length})
          </button>
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="verification-overview">
            {/* Current status */}
            <div className="status-section">
              <h2>Your Verification Status</h2>
              {badges.length > 0 ? (
                <div className="status-card">
                  <VerificationBadge
                    level={verificationStats.verificationLevel}
                    badges={badges}
                    size="large"
                    showTooltip={true}
                  />
                  <div className="status-stats">
                    <div className="stat">
                      <span className="stat-value">{verificationStats.badgesCount.verified}</span>
                      <span className="stat-label">Verified Badges</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{verificationStats.badgesCount.partial}</span>
                      <span className="stat-label">Partial Badges</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{verificationStats.verifiedMetricsCount}</span>
                      <span className="stat-label">Verified Metrics</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>You haven't verified any data yet. Start building trust by connecting your accounts!</p>
                </div>
              )}
            </div>

            {/* Get verified section */}
            <div className="get-verified-section">
              <h2>Get Verified</h2>
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <strong>⚠️ Demo Mode:</strong> OAuth authentication is not yet implemented.
                Connections will create placeholder data for demonstration purposes only.
              </div>
              <p className="section-description">
                Connect your third-party accounts to automatically verify your performance data.
                Verified creators earn more trust and higher rates.
              </p>
              <div className="verification-options-grid">
                {verificationOptions.map((option) => {
                  const isConnected = connections.some(
                    c => c.serviceName === option.type && c.connectionStatus === 'connected'
                  );

                  return (
                    <div key={option.type} className="verification-option-card">
                      <div
                        className="option-icon"
                        style={{ backgroundColor: `${option.color}15`, color: option.color }}
                      >
                        {option.icon}
                      </div>
                      <h3>{option.name}</h3>
                      <p>{option.description}</p>
                      <button
                        className={`btn-option ${isConnected ? 'connected' : 'primary'}`}
                        onClick={() =>
                          isConnected
                            ? setShowAlreadyConnectedModal(true)
                            : handleConnectService(option.type)
                        }
                      >
                        {isConnected ? '✓ Connected' : 'Connect'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Metrics tab */}
        {activeTab === 'metrics' && (
          <div className="metrics-section">
            <div className="section-header">
              <h2>Verified Metrics</h2>
              <button
                className="btn-primary"
                onClick={() => handleRequestVerification('manual')}
              >
                + Add Metric
              </button>
            </div>
            {metrics.length > 0 ? (
              <div className="metrics-grid">
                {metrics.map((metric) => (
                  <VerifiedMetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <h3>No verified metrics yet</h3>
                <p>Connect your accounts to automatically pull verified performance data</p>
              </div>
            )}
          </div>
        )}

        {/* Connections tab */}
        {activeTab === 'connections' && (
          <div className="connections-section">
            <h2>Third-Party Connections</h2>
            <p className="section-description">
              Manage your connected accounts. We use secure OAuth to access your data - we never store passwords.
            </p>
            <div className="connections-list">
              {verificationOptions.filter(o => o.type !== 'manual').map((option) => {
                const connection = connections.find(c => c.serviceName === option.type);
                const isConnected = connection?.connectionStatus === 'connected';

                return (
                  <div key={option.type} className="connection-card">
                    <div className="connection-info">
                      <div
                        className="connection-icon"
                        style={{ backgroundColor: `${option.color}15`, color: option.color }}
                      >
                        {option.icon}
                      </div>
                      <div className="connection-details">
                        <h3>{option.name}</h3>
                        <p>{option.description}</p>
                        {isConnected && connection.lastSyncAt && (
                          <p className="last-sync">
                            Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="connection-actions">
                      {isConnected ? (
                        <>
                          <span className="connection-status connected">
                            ✓ Connected
                          </span>
                          <button
                            className="btn-secondary"
                            onClick={() => handleDisconnectService(option.type)}
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-primary"
                          onClick={() => handleConnectService(option.type)}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Requests tab */}
        {activeTab === 'requests' && (
          <div className="requests-section">
            <h2>Verification Requests</h2>
            {requests.length > 0 ? (
              <div className="requests-list">
                {requests.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-type">{request.requestType}</div>
                    <div className="request-status">{request.status}</div>
                    <div className="request-date">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h3>No pending requests</h3>
                <p>You haven't submitted any verification requests yet</p>
              </div>
            )}
          </div>
        )}

        {/* OAuth Connection Modal */}
        <Modal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          title="Connect Service (Demo Mode)"
          actions={
            <>
              <button className="btn-secondary" onClick={() => setShowOAuthModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={initiateOAuthFlow}>
                Create Demo Connection
              </button>
            </>
          }
        >
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <strong>⚠️ Demo Mode:</strong> Real OAuth authentication is not yet implemented.
            This will create a placeholder connection for demonstration purposes.
          </div>
          <p>In production, you would be redirected to authorize access to your {oauthServiceName} account.</p>
          <p>We would use secure OAuth authentication and only request read-only access to verify your performance metrics.</p>
        </Modal>

        {/* Already Connected Modal */}
        <Modal
          isOpen={showAlreadyConnectedModal}
          onClose={() => setShowAlreadyConnectedModal(false)}
          title="Already Connected"
          actions={
            <button className="btn-primary" onClick={() => setShowAlreadyConnectedModal(false)}>
              OK
            </button>
          }
        >
          <p>This service is already connected to your account.</p>
          <p>Go to the Connections tab to manage your connected services.</p>
        </Modal>

        {/* Disconnect Confirmation Modal */}
        <Modal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          title="Disconnect Service"
          actions={
            <>
              <button className="btn-secondary" onClick={() => setShowDisconnectModal(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDisconnect}>
                Disconnect
              </button>
            </>
          }
        >
          <p>Are you sure you want to disconnect from {serviceToDisconnect}?</p>
          <p><strong>Warning:</strong> This will remove all verified metrics from this service. Your verification score may decrease.</p>
        </Modal>
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

export default Verification;
