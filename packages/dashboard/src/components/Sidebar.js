import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notificationsAPI, cartAPI } from '../api/client';
import { onCartUpdate } from '../utils/events';
import '../styles/sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
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
    // Fetch unread notification count
    const fetchUnreadCount = async () => {
      try {
        const data = await notificationsAPI.getUnreadCount();
        setUnreadCount(data.count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        // Don't show error to user, just keep count at 0
      }
    };

    fetchUnreadCount();
    fetchCartCount();

    // Poll for notification updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for cart updates
    const unsubscribe = onCartUpdate(fetchCartCount);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const menuItems = [
    { icon: '🏠', label: 'For You', path: '/', active: true },
    { icon: '💼', label: 'Services', path: '/shop' },
    { icon: '🛒', label: 'Cart', path: '/cart', badge: cartCount },
    { icon: '🧭', label: 'Explore', path: '/explore' },
    { icon: '👥', label: 'Following', path: '/following' },
    { icon: '👤', label: 'Network', path: '/friends' },
    { icon: '📺', label: 'LIVE', path: '/live' },
    { icon: '💬', label: 'Messages', path: '/messages' },
    { icon: '🔔', label: 'Activity', path: '/activity', badge: unreadCount },
    { icon: '➕', label: 'Upload', path: '/upload', highlight: true },
    { icon: '👨‍💼', label: 'Profile', path: '/profile' },
    { icon: '🔧', label: 'Admin', path: '/admin' },
    { icon: '📊', label: 'Analytics', path: '/dashboard' },
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
          placeholder="Search tags (e.g., #Marketing)"
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
        <div className="footer-section">
          <div className="footer-title">Following accounts</div>
          <div className="following-list">
            <div className="following-item">
              <div className="following-avatar"></div>
              <span>Following feed</span>
            </div>
          </div>
        </div>

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
