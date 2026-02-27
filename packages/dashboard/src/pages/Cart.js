import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { emitCartUpdate } from '../utils/events';
import '../styles/cart.css';

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, type: '', message: '', action: null });
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await cartAPI.get();
      setCart(data);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError('Failed to load cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    setUpdating(itemId);
    try {
      await cartAPI.update(itemId, newQuantity);
      await loadCart();
      emitCartUpdate(); // Notify sidebar to update cart count
    } catch (err) {
      console.error('Error updating quantity:', err);
      setToast({
        isVisible: true,
        type: 'error',
        message: 'Failed to update quantity. Please try again.',
      });
    } finally {
      setUpdating(null);
    }
  };

  const confirmRemoveItem = (itemId) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      message: 'Are you sure you want to remove this item from your cart?',
      action: () => handleRemoveItem(itemId),
    });
  };

  const handleRemoveItem = async (itemId) => {
    setModal({ ...modal, isOpen: false });
    setUpdating(itemId);
    try {
      await cartAPI.remove(itemId);
      await loadCart();
      emitCartUpdate(); // Notify sidebar to update cart count
      setToast({
        isVisible: true,
        type: 'success',
        message: 'Item removed from cart.',
      });
    } catch (err) {
      console.error('Error removing item:', err);
      setToast({
        isVisible: true,
        type: 'error',
        message: 'Failed to remove item. Please try again.',
      });
    } finally {
      setUpdating(null);
    }
  };

  const confirmClearCart = () => {
    setModal({
      isOpen: true,
      type: 'confirm',
      message: 'Are you sure you want to clear your entire cart? This action cannot be undone.',
      action: handleClearCart,
    });
  };

  const handleClearCart = async () => {
    setModal({ ...modal, isOpen: false });
    setLoading(true);
    try {
      await cartAPI.clear();
      await loadCart();
      emitCartUpdate(); // Notify sidebar to update cart count
      setToast({
        isVisible: true,
        type: 'success',
        message: 'Cart cleared successfully.',
      });
    } catch (err) {
      console.error('Error clearing cart:', err);
      setToast({
        isVisible: true,
        type: 'error',
        message: 'Failed to clear cart. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', message: '', action: null });
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading cart...</div>
        </main>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>🛒 Shopping Cart</h1>
          <p>Review your items and proceed to checkout</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isEmpty ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add some products to your cart to get started</p>
            <button className="btn-primary" onClick={() => navigate('/shop')}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="cart-container">
            <div className="cart-items">
              <div className="cart-header">
                <h2>Cart Items ({cart.itemCount})</h2>
                {cart.itemCount > 0 && (
                  <button className="btn-secondary" onClick={confirmClearCart}>
                    Clear Cart
                  </button>
                )}
              </div>

              {cart.items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.product.imageUrl} alt={item.product.name} />
                  </div>
                  <div className="cart-item-details">
                    <h3>{item.product.name}</h3>
                    <p className="cart-item-category">{item.product.category}</p>
                    <p className="cart-item-description">{item.product.description}</p>
                    <p className="cart-item-price">${item.product.price.toFixed(2)} each</p>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-controls">
                      <button
                        className="quantity-btn"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id || item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button
                        className="quantity-btn"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={updating === item.id || item.quantity >= item.product.stockQuantity}
                      >
                        +
                      </button>
                    </div>
                    <p className="cart-item-subtotal">
                      Subtotal: <strong>${item.subtotal.toFixed(2)}</strong>
                    </p>
                    <button
                      className="btn-remove"
                      onClick={() => confirmRemoveItem(item.id)}
                      disabled={updating === item.id}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Items ({cart.itemCount}):</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="summary-row summary-total">
                <span>Total:</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <button className="btn-primary btn-checkout" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
              <button className="btn-secondary" onClick={() => navigate('/shop')}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </main>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title="⚠️ Confirm Action"
        actions={
          <>
            <button className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn-danger" onClick={modal.action}>
              Confirm
            </button>
          </>
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

export default Cart;
