import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, cartAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { emitCartUpdate } from '../utils/events';
import '../styles/shop.css';

function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
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
      const [productsData, categoriesData] = await Promise.all([
        productsAPI.getAll(),
        productsAPI.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(['All', ...categoriesData]);
    } catch (err) {
      console.error('Error loading products:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load services. Please try again.');
      }
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

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

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
          <h1>💼 Services Marketplace</h1>
          <p>Hire proven B2B marketing professionals</p>
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
          {!error && filteredProducts.length === 0 ? (
            <div className="empty-state">
              <p>No services available in this category</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <img src={product.imageUrl} alt={product.name} />
                </div>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button
                      className="btn-primary"
                      onClick={() => handleAddToCart(product.id)}
                      disabled={addingToCart === product.id || product.stockQuantity === 0}
                    >
                      {addingToCart === product.id ? 'Booking...' : product.stockQuantity === 0 ? 'Unavailable' : 'Book Service'}
                    </button>
                  </div>
                </div>
              </div>
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
