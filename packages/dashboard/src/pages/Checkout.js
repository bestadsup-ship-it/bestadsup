import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { servicesAPI, ordersAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import '../styles/checkout.css';

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId, selectedTier } = location.state || {};

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  // Form data
  const [requirements, setRequirements] = useState('');

  useEffect(() => {
    if (!serviceId) {
      navigate('/shop');
      return;
    }
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await servicesAPI.getById(serviceId);
      setService(data);
    } catch (err) {
      console.error('Error loading service:', err);
      setError('Failed to load service details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const orderData = {
        service_id: serviceId,
        buyer_requirements: requirements || undefined,
      };

      // Add tier info if selected
      if (selectedTier) {
        orderData.selected_tier_name = selectedTier.name;
        orderData.selected_tier_price = selectedTier.price;
      }

      const order = await ordersAPI.create(orderData);

      setToast({
        isVisible: true,
        type: 'success',
        message: 'Order created! Redirecting to payment...',
      });

      // Redirect to payment page
      setTimeout(() => {
        navigate(`/payment/${order.id}`);
      }, 1000);
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || 'Failed to create order. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>
            Loading checkout...
          </div>
        </main>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="error-message">Service not found</div>
        </main>
      </div>
    );
  }

  const price = selectedTier ? selectedTier.price : service.price;
  const platformFee = Math.round(price * 0.10 * 100) / 100;
  const total = price;

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="checkout-container">
          <div className="checkout-header">
            <h1>Checkout</h1>
            <button className="btn-text" onClick={() => navigate(-1)}>
              ← Back to Service
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="checkout-content">
            {/* Left Column - Order Form */}
            <div className="checkout-form-section">
              <div className="checkout-card">
                <h2>Order Details</h2>

                <div className="service-summary">
                  {service.image_url && (
                    <img src={service.image_url} alt={service.name} className="service-thumbnail" />
                  )}
                  <div className="service-info">
                    <h3>{service.name}</h3>
                    {selectedTier && <p className="tier-name">Tier: {selectedTier.name}</p>}
                    {service.creator && (
                      <p className="creator-name">by {service.creator.name}</p>
                    )}
                  </div>
                </div>

                <form onSubmit={handlePlaceOrder}>
                  <div className="form-group">
                    <label htmlFor="requirements">
                      Project Requirements
                      <span className="label-hint">(optional)</span>
                    </label>
                    <textarea
                      id="requirements"
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="Describe your project needs, goals, target audience, any specific requirements..."
                      rows={6}
                    />
                    <small className="field-hint">
                      Provide details to help the creator understand your project better
                    </small>
                  </div>

                  <div className="form-section">
                    <h3>What Happens Next?</h3>
                    <ol className="next-steps">
                      <li>Your order will be created with status "Pending Payment"</li>
                      <li>You'll be redirected to complete payment (Stripe integration coming soon)</li>
                      <li>Once paid, the creator will be notified to start work</li>
                      <li>Track progress in your project workspace</li>
                    </ol>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary btn-block"
                    disabled={creating}
                  >
                    {creating ? 'Creating Order...' : `Place Order - $${total.toFixed(2)}`}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="checkout-summary-section">
              <div className="checkout-card summary-card">
                <h2>Order Summary</h2>

                <div className="summary-row">
                  <span>Service Price</span>
                  <span className="price">${price.toFixed(2)}</span>
                </div>

                {selectedTier && (
                  <div className="summary-row tier-info">
                    <span>{selectedTier.name}</span>
                    <span className="tier-badge">Selected Tier</span>
                  </div>
                )}

                <div className="summary-divider" />

                <div className="summary-row total">
                  <span>Total</span>
                  <span className="price">${total.toFixed(2)}</span>
                </div>

                <div className="summary-note">
                  <p>
                    <strong>Note:</strong> Payment processing will be integrated in a future update.
                    For now, orders will be created with "Pending Payment" status.
                  </p>
                </div>

                <div className="summary-details">
                  <h3>What's Included</h3>
                  {selectedTier ? (
                    <ul>
                      {selectedTier.deliverables?.map((item, index) => (
                        <li key={index}>✓ {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul>
                      {service.includes?.map((item, index) => (
                        <li key={index}>✓ {item}</li>
                      ))}
                    </ul>
                  )}

                  {service.delivery_time_days && (
                    <div className="delivery-info">
                      <strong>Delivery Time:</strong> {service.delivery_time_days} days
                    </div>
                  )}

                  {service.revisions_included !== null && service.revisions_included !== undefined && (
                    <div className="revisions-info">
                      <strong>Revisions:</strong>{' '}
                      {service.revisions_included === -1
                        ? 'Unlimited'
                        : `${service.revisions_included} included`}
                    </div>
                  )}
                </div>
              </div>

              <div className="checkout-card trust-signals">
                <h3>Why Order With Us?</h3>
                <ul>
                  <li>✓ Secure payment processing</li>
                  <li>✓ Project milestone tracking</li>
                  <li>✓ Direct messaging with creator</li>
                  <li>✓ Deliverable approval system</li>
                  <li>✓ Revision management</li>
                  <li>✓ Money-back guarantee</li>
                </ul>
              </div>
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

export default Checkout;
