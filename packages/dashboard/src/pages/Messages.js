import React, { useState, useEffect } from 'react';
import { messagesAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import '../styles/messages.css';

function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
    }
  }, [selectedChat]);

  const loadConversations = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedConversations = await messagesAPI.getConversations();
      setConversations(fetchedConversations);
    } catch (err) {
      console.error('Error loading conversations:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load conversations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const fetchedMessages = await messagesAPI.getMessages(conversationId);
      setMessages(fetchedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      // Only show error if it's an actual failure, not an empty result
      if (err.response?.status !== 404) {
        setError('Failed to load messages. Please try again.');
      }
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (messageText.trim() && selectedChat && !sending) {
      setSending(true);
      try {
        const newMessage = await messagesAPI.sendMessage(selectedChat, messageText.trim());
        setMessages([...messages, newMessage]);
        setMessageText('');
        // Refresh conversations to update last message
        loadConversations();
      } catch (err) {
        console.error('Error sending message:', err);
        alert('Failed to send message. Please try again.');
      } finally {
        setSending(false);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffMs = now - msgTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return msgTime.toLocaleDateString();
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const msgTime = new Date(timestamp);
    return msgTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="messages-main">
        <div className="messages-container">
          <div className="conversations-panel">
            <div className="conversations-header">
              <h2>Messages</h2>
            </div>
            {error && <div className="error-message" style={{ padding: '10px', fontSize: '14px' }}>{error}</div>}

            {loading ? (
              <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>Loading conversations...</div>
            ) : (
              <div className="conversations-list">
                {conversations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No conversations yet
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`conversation-item ${selectedChat === conv.id ? 'active' : ''}`}
                      onClick={() => setSelectedChat(conv.id)}
                    >
                      <img src={conv.otherUser.avatar} alt={conv.otherUser.name} className="conversation-avatar" />
                      <div className="conversation-info">
                        <div className="conversation-header-row">
                          <h4 className="conversation-name">
                            {conv.otherUser.name}
                            {conv.otherUser.isVerified && ' ✓'}
                          </h4>
                          <span className="conversation-time">{formatTimestamp(conv.lastMessageTime)}</span>
                        </div>
                        <p className="conversation-preview">{conv.lastMessage || 'No messages yet'}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="chat-panel">
            {selectedChat ? (
              <>
                <div className="chat-header">
                  <img
                    src={conversations.find(c => c.id === selectedChat)?.otherUser.avatar}
                    alt="Avatar"
                    className="chat-avatar"
                  />
                  <h3>
                    {conversations.find(c => c.id === selectedChat)?.otherUser.name}
                    {conversations.find(c => c.id === selectedChat)?.otherUser.isVerified && ' ✓'}
                  </h3>
                </div>

                {messagesLoading ? (
                  <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>Loading messages...</div>
                ) : (
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div key={msg.id} className={`message ${msg.isMine ? 'mine' : ''}`}>
                          {!msg.isMine && (
                            <img
                              src={msg.sender.avatar}
                              alt="Avatar"
                              className="message-avatar"
                            />
                          )}
                          <div className="message-content">
                            <div className="message-bubble">{msg.content}</div>
                            <span className="message-time">{formatMessageTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" className="send-btn" disabled={sending || !messageText.trim()}>
                    {sending ? '...' : '➤'}
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
