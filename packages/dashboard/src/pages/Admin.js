import React, { useState, useEffect } from 'react';
import { productsAPI, authAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import ImageUpload from '../components/ImageUpload';
import '../styles/admin.css';

function Admin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
    stockQuantity: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products. Make sure you have admin access.');
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
    setError('');

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      imageUrl: formData.imageUrl || '/BestAdsUp.jpg',
      category: formData.category,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
    };

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
        setSuccessMessage('Product updated successfully!');
      } else {
        await productsAPI.create(productData);
        setSuccessMessage('Product created successfully!');
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        category: '',
        stockQuantity: '',
      });
      setShowSuccessModal(true);
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.error || 'Failed to save product. Make sure you have admin access.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      imageUrl: product.imageUrl || '',
      category: product.category,
      stockQuantity: product.stockQuantity.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productsAPI.delete(productId);
      setSuccessMessage('Product deleted successfully!');
      setShowSuccessModal(true);
      loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      category: '',
      stockQuantity: '',
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar />
        <main className="page-main">
          <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="admin-header">
          <div>
            <h1>🔧 Admin Dashboard</h1>
            <p>Manage products and inventory</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add New Product
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {showSuccessModal && (
          <div className="admin-modal-overlay" onClick={() => setShowSuccessModal(false)}>
            <div className="success-modal" onClick={(e) => e.stopPropagation()}>
              <div className="success-icon">✅</div>
              <h2>{successMessage}</h2>
              <button className="btn-primary" onClick={() => setShowSuccessModal(false)}>
                OK
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="admin-modal-overlay" onClick={handleCancel}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>{editingProduct ? 'Edit Product' : 'Create New Product'}</h2>
                <button className="close-btn" onClick={handleCancel}>×</button>
              </div>
              <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Advertising">Advertising</option>
                    <option value="Tools">Tools</option>
                    <option value="Services">Services</option>
                  </select>
                </div>

                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(value) => setFormData(prev => ({ ...prev, imageUrl: value }))}
                  label="Product Image"
                />

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="admin-products-table">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    No products found. Create your first product!
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <img src={product.imageUrl} alt={product.name} className="product-thumb" />
                    </td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc">{product.description}</div>
                    </td>
                    <td>
                      <span className="category-badge">{product.category}</span>
                    </td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>
                      <span className={`stock-badge ${product.stockQuantity === 0 ? 'out-of-stock' : ''}`}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => handleEdit(product)} title="Edit">
                          ✏️
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(product.id)} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default Admin;
