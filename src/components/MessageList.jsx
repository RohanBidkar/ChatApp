import { useEffect, useRef } from 'react';
import TypingIndicator from './TypingIndicator';
import './MessageList.css';

const MessageList = ({ messages, currentUser, chatContext }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (message) => {
    return message.fromId === currentUser.userId;
  };

  if (messages.length === 0) {
    return (
      <div className="messages-container">
        <div className="no-messages">
          <div className="no-messages-icon">💬</div>
          <p>No messages yet</p>
          <p className="no-messages-hint">
            {chatContext === 'private' 
              ? 'Start the conversation by sending a message!'
              : 'Be the first to say something in this room!'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-list">
        {messages.map((message, index) => (
          <div 
            key={`${message.timestamp}-${index}`}
            className={`message ${isOwnMessage(message) ? 'own-message' : 'other-message'}`}
          >
            <div className="message-content">
              {!isOwnMessage(message) && (
                <div className="message-sender">
                  {message.from}
                </div>
              )}
              <div className="message-text">
                {message.message}
              </div>
              <div className="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <TypingIndicator chatContext={chatContext} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;