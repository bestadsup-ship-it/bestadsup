import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, authAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import '../styles/orders.css';

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, buyer, creator
  const user = authAPI.getUser();

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ordersAPI.getAll({ role: filter === 'all' ? undefined : filter });
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      // Only show error if it's not a 404 (no orders found)
      if (err.response?.status !== 404) {
        setError('Failed to load orders. Please try again.');
      } else {
        // 404 is okay - just means no orders
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
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

  const formatStatus = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>
            Loading orders...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>Track and manage your service orders</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="orders-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders
          </button>
          {user?.account_type !== 'creator' && (
            <button
              className={`filter-btn ${filter === 'buyer' ? 'active' : ''}`}
              onClick={() => setFilter('buyer')}
            >
              As Buyer
            </button>
          )}
          {user?.account_type !== 'buyer' && (
            <button
              className={`filter-btn ${filter === 'creator' ? 'active' : ''}`}
              onClick={() => setFilter('creator')}
            >
              As Creator
            </button>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3>No Orders Yet</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {filter === 'buyer'
                ? 'You haven\'t placed any orders yet. Browse the marketplace to find services.'
                : 'You haven\'t received any orders yet. Keep promoting your services!'}
            </p>
            {filter === 'buyer' && (
              <button className="btn-primary" onClick={() => navigate('/shop')}>
                Browse Services
              </button>
            )}
            {filter === 'creator' && (
              <button className="btn-primary" onClick={() => navigate('/services/create')}>
                Create Service
              </button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div
                key={order.id}
                className="order-card"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="order-header">
                  <div className="order-title">
                    <h3>{order.service_name}</h3>
                    <span className="order-number">{order.order_number}</span>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                    {formatStatus(order.status)}
                  </span>
                </div>

                <div className="order-details">
                  <div className="order-meta">
                    <div className="meta-item">
                      <span className="meta-label">
                        {filter === 'creator' ? 'Buyer' : 'Creator'}:
                      </span>
                      <span className="meta-value">
                        {filter === 'creator'
                          ? order.buyer?.name || 'Unknown'
                          : order.creator?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Created:</span>
                      <span className="meta-value">{formatDate(order.created_at)}</span>
                    </div>
                    {order.expected_delivery_date && (
                      <div className="meta-item">
                        <span className="meta-label">Expected Delivery:</span>
                        <span className="meta-value">{formatDate(order.expected_delivery_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-price">
                    ${order.price.toFixed(2)}
                  </div>
                </div>

                {order.buyer_requirements && (
                  <div className="order-requirements">
                    <strong>Requirements:</strong>{' '}
                    {order.buyer_requirements.length > 100
                      ? order.buyer_requirements.substring(0, 100) + '...'
                      : order.buyer_requirements}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Orders;
