import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cartAPI } from '../api/client';
import { onCartUpdate } from '../utils/events';
import '../styles/sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart item count
  const fetchCartCount = async () => {
    try {
      const data = await cartAPI.get();
      setCartCount(data.itemCount || 0);
    } catch (error) {
      console.error('Error fetching cart count:', error);
      // Don't show error to user, just keep count at 0
    }
  };

  useEffect(() => {
    fetchCartCount();

    // Listen for cart updates
    const unsubscribe = onCartUpdate(fetchCartCount);

    return () => {
      unsubscribe();
    };
  }, []);

  const menuItems = [
    { icon: '🏠', label: 'Browse Services', path: '/shop', active: true },
    { icon: '📦', label: 'My Orders', path: '/orders' },
    { icon: '🛒', label: 'Cart', path: '/cart', badge: cartCount },
    { icon: '➕', label: 'List Service', path: '/upload', highlight: true },
    { icon: '👨‍💼', label: 'My Profile', path: '/profile' },
    { icon: '🔐', label: 'Verification', path: '/verification' },
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Remove # if user included it
      const tag = searchQuery.trim().replace(/^#/, '');
      // Navigate to feed with tag filter
      navigate(`/?tag=${encodeURIComponent(tag)}`);
      setSearchQuery('');
    }
  };

  return (
    <aside className="main-sidebar">
      <div className="sidebar-logo">
        <img src="/BestAdsUp.jpg" alt="BestAdsUp" />
      </div>

      <form className="sidebar-search" onSubmit={handleSearch}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-links">
          <a href="#">Company</a>
          <a href="#">Program</a>
          <a href="#">Terms & Policies</a>
          <div className="copyright">© 2026 BestAdsUp</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
