import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { emitCartUpdate } from '../utils/events';
import '../styles/checkout.css';

function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ isOpen: false, message: '' });
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  const [formData, setFormData] = useState({
    // Shipping info
    shippingName: '',
    shippingEmail: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'US',

    // Payment info
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',

    // Additional
    notes: '',
  });

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await cartAPI.get();
      if (!data || data.items.length === 0) {
        navigate('/cart');
        return;
      }
      setCart(data);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError('Failed to load cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      // TODO: Implement actual order creation API
      // For now, just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear cart after successful order
      await cartAPI.clear();
      emitCartUpdate(); // Notify sidebar to update cart count

      setModal({
        isOpen: true,
        message: 'Your order has been placed successfully! You will receive a confirmation email shortly.',
      });
    } catch (err) {
      console.error('Error processing order:', err);
      setToast({
        isVisible: true,
        type: 'error',
        message: 'Failed to process order. Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, message: '' });
    navigate('/shop');
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading checkout...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>💳 Checkout</h1>
          <p>Complete your purchase</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="checkout-container" onSubmit={handleSubmit}>
          <div className="checkout-forms">
            {/* Shipping Information */}
            <div className="checkout-section">
              <h2>Shipping Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="shippingName"
                    value={formData.shippingName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="shippingEmail"
                    value={formData.shippingEmail}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address *</label>
                  <input
                    type="text"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="shippingCity"
                    value={formData.shippingCity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State/Province *</label>
                  <input
                    type="text"
                    name="shippingState"
                    value={formData.shippingState}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ZIP/Postal Code *</label>
                  <input
                    type="text"
                    name="shippingZip"
                    value={formData.shippingZip}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Country *</label>
                  <select
                    name="shippingCountry"
                    value={formData.shippingCountry}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="checkout-section">
              <h2>Payment Information</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Payment Method *</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="card">Credit/Debit Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                {formData.paymentMethod === 'card' && (
                  <>
                    <div className="form-group full-width">
                      <label>Card Number *</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Cardholder Name *</label>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Expiry Date *</label>
                      <input
                        type="text"
                        name="cardExpiry"
                        value={formData.cardExpiry}
                        onChange={handleInputChange}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>CVC *</label>
                      <input
                        type="text"
                        name="cardCvc"
                        value={formData.cardCvc}
                        onChange={handleInputChange}
                        placeholder="123"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Order Notes */}
            <div className="checkout-section">
              <h2>Order Notes (Optional)</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Special instructions or notes for your order..."
                rows="4"
              />
            </div>
          </div>

          <div className="checkout-summary">
            <h2>Order Summary</h2>

            <div className="summary-items">
              {cart && cart.items.map(item => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.product.name}</span>
                    <span className="summary-item-qty">x{item.quantity}</span>
                  </div>
                  <span className="summary-item-price">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${cart?.total.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>$0.00</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>$0.00</span>
              </div>
              <div className="summary-row summary-total">
                <span>Total:</span>
                <span>${cart?.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-place-order"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Place Order'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/cart')}
              disabled={processing}
            >
              Back to Cart
            </button>
          </div>
        </form>
      </main>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title="✅ Order Placed Successfully!"
        actions={
          <button className="btn-primary" onClick={closeModal}>
            Continue Shopping
          </button>
        }
      >
        <p>{modal.message}</p>
      </Modal>

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
