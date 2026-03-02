import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ordersAPI, paymentsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import '../styles/payment.css';

// Load Stripe with publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

// Payment form component
function PaymentForm({ order, clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required', // Don't redirect if not needed
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        await paymentsAPI.confirmPayment(paymentIntent.id);
        onSuccess(order.id);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement />

      {error && <div className="error-message" style={{ marginTop: '16px' }}>{error}</div>}

      <button
        type="submit"
        className="btn-primary btn-block"
        disabled={!stripe || processing}
        style={{ marginTop: '24px' }}
      >
        {processing ? 'Processing...' : `Pay $${order.price.toFixed(2)}`}
      </button>

      <p className="payment-note">
        By confirming payment, you agree to our terms and conditions. Your payment is secure and encrypted.
      </p>
    </form>
  );
}

// Main payment page component
function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  useEffect(() => {
    loadOrderAndCreatePaymentIntent();
  }, [orderId]);

  const loadOrderAndCreatePaymentIntent = async () => {
    setLoading(true);
    setError('');

    try {
      // Load order details
      const orderData = await ordersAPI.getById(orderId);
      setOrder(orderData);

      // Check if order is payable
      if (orderData.status !== 'pending_payment') {
        setError('This order has already been paid or is not available for payment.');
        setLoading(false);
        return;
      }

      // Create payment intent
      const paymentData = await paymentsAPI.createPaymentIntent(orderId);
      setClientSecret(paymentData.clientSecret);
    } catch (err) {
      console.error('Error loading payment:', err);
      setError(err.response?.data?.message || 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (orderId) => {
    setToast({
      isVisible: true,
      type: 'success',
      message: 'Payment successful!',
    });

    setTimeout(() => {
      navigate(`/orders/${orderId}`);
    }, 1500);
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
            Loading payment...
          </div>
        </main>
      </div>
    );
  }

  if (error || !order || !clientSecret) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="error-state" style={{ padding: '40px', textAlign: 'center' }}>
            <h3>{error || 'Unable to load payment'}</h3>
            <button className="btn-primary" onClick={() => navigate('/orders')}>
              Back to Orders
            </button>
          </div>
        </main>
      </div>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#007bff',
      },
    },
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="payment-container">
          <div className="payment-header">
            <h1>Complete Payment</h1>
            <button className="btn-text" onClick={() => navigate(`/orders/${orderId}`)}>
              ← Back to Order
            </button>
          </div>

          <div className="payment-content">
            {/* Left Column - Payment Form */}
            <div className="payment-form-section">
              <div className="payment-card">
                <h2>Payment Details</h2>

                <div className="order-summary-compact">
                  <div className="order-info-row">
                    <span>Order:</span>
                    <span className="order-number">{order.order_number}</span>
                  </div>
                  <div className="order-info-row">
                    <span>Service:</span>
                    <span>{order.service_name}</span>
                  </div>
                  <div className="order-info-row total">
                    <span>Total:</span>
                    <span className="price">${order.price.toFixed(2)}</span>
                  </div>
                </div>

                <Elements stripe={stripePromise} options={stripeOptions}>
                  <PaymentForm order={order} clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                </Elements>
              </div>
            </div>

            {/* Right Column - Order Info */}
            <div className="payment-sidebar">
              <div className="sidebar-card">
                <h3>Order Summary</h3>
                <div className="summary-details">
                  <div className="summary-row">
                    <span>Service:</span>
                    <span>{order.service_name}</span>
                  </div>
                  {order.selected_tier_name && (
                    <div className="summary-row">
                      <span>Tier:</span>
                      <span>{order.selected_tier_name}</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span>Creator:</span>
                    <span>{order.creator?.name || 'Creator'}</span>
                  </div>
                  {order.delivery_time_days && (
                    <div className="summary-row">
                      <span>Delivery:</span>
                      <span>{order.delivery_time_days} days</span>
                    </div>
                  )}
                  <div className="summary-divider" />
                  <div className="summary-row total">
                    <span>Total Amount:</span>
                    <span className="price">${order.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-card security-info">
                <h3>🔒 Secure Payment</h3>
                <ul>
                  <li>✓ Encrypted connection</li>
                  <li>✓ PCI-compliant processing</li>
                  <li>✓ Powered by Stripe</li>
                  <li>✓ No card details stored</li>
                </ul>
              </div>

              <div className="sidebar-card">
                <h3>What Happens Next?</h3>
                <ol className="next-steps-list">
                  <li>Payment is processed securely</li>
                  <li>Creator is notified to start work</li>
                  <li>Track progress in your order workspace</li>
                  <li>Approve deliverables when complete</li>
                </ol>
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

export default Payment;
