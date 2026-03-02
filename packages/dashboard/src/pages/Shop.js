import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI, cartAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import ServiceCard from '../components/ServiceCard';
import Toast from '../components/Toast';
import { emitCartUpdate } from '../utils/events';
import '../styles/shop.css';

function Shop() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [servicesData, categoriesData] = await Promise.all([
        servicesAPI.getAll(),
        servicesAPI.getCategories(),
      ]);
      setServices(servicesData || []);
      // Extract category slugs from category objects
      const categoryList = categoriesData?.map(cat => cat.slug) || [];
      setCategories(['All', ...categoryList]);
    } catch (err) {
      console.error('Error loading services:', err);
      // Set empty arrays instead of showing error - user might just not have data yet
      setServices([]);
      setCategories(['All']);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    setAddingToCart(productId);
    try {
      await cartAPI.add(productId, 1);
      emitCartUpdate(); // Notify sidebar to update cart count
      setToast({
        isVisible: true,
        type: 'success',
        message: 'Service added to cart!',
      });
    } catch (err) {
      console.error('Error adding to cart:', err);
      setToast({
        isVisible: true,
        type: 'error',
        message: 'Failed to add service to cart. Please try again.',
      });
    } finally {
      setAddingToCart(null);
    }
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading services...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Find Your SaaS Marketer</h1>
          <p>Fixed prices. Proven results. Hire in minutes.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="shop-filters">
          {categories.map(category => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="products-grid">
          {!error && filteredServices.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
              <h3 style={{ marginBottom: '8px' }}>
                {services.length === 0 ? 'Coming Soon' : `No services in "${selectedCategory}"`}
              </h3>
              <p style={{ color: '#666', marginBottom: '20px', maxWidth: '400px', margin: '0 auto' }}>
                {services.length === 0
                  ? 'We\'re onboarding vetted SaaS marketing experts. Want early access?'
                  : 'Try a different category or check back soon.'}
              </p>
              {services.length === 0 && (
                <button
                  className="btn-primary"
                  onClick={() => window.location.href = '/signup'}
                  style={{ marginTop: '16px' }}
                >
                  Join Waitlist
                </button>
              )}
            </div>
          ) : (
            filteredServices.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))
          )}
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

export default Shop;
