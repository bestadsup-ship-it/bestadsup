import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/shop.css';

function Shop() {
  const [products] = useState([
    {
      id: 1,
      name: 'Premium Ad Package',
      price: 99.99,
      image: '/BestAdsUp.jpg',
      description: '10,000 impressions guaranteed',
      category: 'Advertising'
    },
    {
      id: 2,
      name: 'Boost Pack',
      price: 49.99,
      image: '/BestAdsUp.jpg',
      description: '5,000 impressions',
      category: 'Advertising'
    },
    {
      id: 3,
      name: 'Analytics Pro',
      price: 29.99,
      image: '/BestAdsUp.jpg',
      description: 'Advanced analytics dashboard',
      category: 'Tools'
    },
  ]);

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>🛍️ Shop</h1>
          <p>Browse advertising packages and tools</p>
        </div>

        <div className="shop-filters">
          <button className="filter-btn active">All</button>
          <button className="filter-btn">Advertising</button>
          <button className="filter-btn">Tools</button>
          <button className="filter-btn">Services</button>
        </div>

        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-info">
                <span className="product-category">{product.category}</span>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">${product.price}</span>
                  <button className="btn-primary">Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Shop;
