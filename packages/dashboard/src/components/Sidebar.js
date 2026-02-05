import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: '🏠', label: 'For You', path: '/', active: true },
    { icon: '🛍️', label: 'Shop', path: '/shop' },
    { icon: '🧭', label: 'Explore', path: '/explore' },
    { icon: '👥', label: 'Following', path: '/following' },
    { icon: '👤', label: 'Friends', path: '/friends' },
    { icon: '📺', label: 'LIVE', path: '/live' },
    { icon: '💬', label: 'Messages', path: '/messages' },
    { icon: '🔔', label: 'Activity', path: '/activity', badge: 10 },
    { icon: '➕', label: 'Upload', path: '/upload', highlight: true },
    { icon: '👨‍💼', label: 'Profile', path: '/profile' },
    { icon: '📊', label: 'Analytics', path: '/dashboard' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="main-sidebar">
      <div className="sidebar-logo">
        <img src="/BestAdsUp.jpg" alt="BestAdsUp" />
      </div>

      <div className="sidebar-search">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
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
