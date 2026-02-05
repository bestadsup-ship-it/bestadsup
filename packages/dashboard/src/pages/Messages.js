import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/messages.css';

function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [conversations] = useState([
    {
      id: 1,
      name: 'Marketing Pro',
      avatar: '/BestAdsUp.jpg',
      lastMessage: 'Thanks for the collaboration!',
      timestamp: '2m ago',
      unread: 2,
    },
    {
      id: 2,
      name: 'Sales Team',
      avatar: '/BestAdsUp.jpg',
      lastMessage: 'When can we schedule a call?',
      timestamp: '1h ago',
      unread: 0,
    },
  ]);

  const [messages] = useState([
    {
      id: 1,
      senderId: 1,
      text: 'Hey! How are you?',
      timestamp: '10:30 AM',
      isMine: false,
    },
    {
      id: 2,
      senderId: 'me',
      text: 'Great! Thanks for asking',
      timestamp: '10:32 AM',
      isMine: true,
    },
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      console.log('Sending:', messageText);
      setMessageText('');
    }
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="messages-main">
        <div className="messages-container">
          <div className="conversations-panel">
            <div className="conversations-header">
              <h2>Messages</h2>
              <button className="compose-btn">✏️</button>
            </div>
            <div className="search-messages">
              <input type="text" placeholder="Search messages..." />
            </div>
            <div className="conversations-list">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedChat === conv.id ? 'active' : ''}`}
                  onClick={() => setSelectedChat(conv.id)}
                >
                  <img src={conv.avatar} alt={conv.name} className="conversation-avatar" />
                  <div className="conversation-info">
                    <div className="conversation-header-row">
                      <h4 className="conversation-name">{conv.name}</h4>
                      <span className="conversation-time">{conv.timestamp}</span>
                    </div>
                    <p className="conversation-preview">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="chat-panel">
            {selectedChat ? (
              <>
                <div className="chat-header">
                  <img
                    src={conversations.find(c => c.id === selectedChat)?.avatar}
                    alt="Avatar"
                    className="chat-avatar"
                  />
                  <h3>{conversations.find(c => c.id === selectedChat)?.name}</h3>
                </div>
                <div className="chat-messages">
                  {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.isMine ? 'mine' : ''}`}>
                      {!msg.isMine && (
                        <img
                          src={conversations.find(c => c.id === selectedChat)?.avatar}
                          alt="Avatar"
                          className="message-avatar"
                        />
                      )}
                      <div className="message-content">
                        <div className="message-bubble">{msg.text}</div>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button type="submit" className="send-btn">
                    ➤
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Messages;
