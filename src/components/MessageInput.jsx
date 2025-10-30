import { useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import './MessageInput.css';

const MessageInput = ({ 
  onSendMessage, 
  placeholder = "Type a message...",
  selectedUser = null,
  currentRoom = null
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { startTyping, stopTyping } = useSocket();
  const typingTimeoutRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      handleStopTyping();
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      
      // Send appropriate typing event
      if (selectedUser) {
        startTyping('private', selectedUser.userId);
      } else if (currentRoom) {
        startTyping('room', currentRoom.roomId);
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      
      // Send appropriate stop typing event
      if (selectedUser) {
        stopTyping('private', selectedUser.userId);
      } else if (currentRoom) {
        stopTyping('room', currentRoom.roomId);
      }
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-wrapper">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={handleStopTyping}
            placeholder={placeholder}
            className="message-textarea"
            rows="1"
            maxLength={500}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!message.trim()}
          >
            📤
          </button>
        </div>
        <div className="message-info">
          <span className="character-count">
            {message.length}/500
          </span>
          <span className="send-hint">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;