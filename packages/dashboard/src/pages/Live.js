import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/live.css';

function Live() {
  const [liveStreams] = useState([
    {
      id: 1,
      title: 'B2B Marketing Masterclass',
      host: 'Marketing Pro',
      viewers: 1234,
      thumbnail: '/BestAdsUp.jpg',
      isLive: true,
    },
    {
      id: 2,
      title: 'Product Launch Event',
      host: 'Tech Corp',
      viewers: 856,
      thumbnail: '/BestAdsUp.jpg',
      isLive: true,
    },
  ]);

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>📺 LIVE</h1>
          <p>Watch live streams and events</p>
          <button className="btn-primary go-live-btn">🔴 Go Live</button>
        </div>

        <div className="live-grid">
          {liveStreams.map(stream => (
            <div key={stream.id} className="live-card">
              <div className="live-thumbnail">
                <img src={stream.thumbnail} alt={stream.title} />
                {stream.isLive && (
                  <div className="live-badge">
                    <span className="live-indicator"></span>
                    LIVE
                  </div>
                )}
                <div className="viewer-count">
                  👁️ {stream.viewers.toLocaleString()}
                </div>
              </div>
              <div className="live-info">
                <h3 className="live-title">{stream.title}</h3>
                <p className="live-host">by {stream.host}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="upcoming-section">
          <h2>Upcoming Events</h2>
          <div className="empty-state">
            <p>No upcoming events scheduled</p>
            <button className="btn-secondary">Schedule Event</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Live;
