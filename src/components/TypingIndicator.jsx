import { useSocket } from '../context/SocketContext';
import './TypingIndicator.css';

const TypingIndicator = ({ chatContext }) => {
  const { typingUsers, onlineUsers, roomUsers } = useSocket();

  if (typingUsers.size === 0) return null;

  // Get usernames of typing users
  const getTypingUsernames = () => {
    const relevantUsers = chatContext === 'room' ? roomUsers : onlineUsers;
    return Array.from(typingUsers)
      .map(userId => {
        const user = relevantUsers.find(u => u.userId === userId);
        return user ? user.username : null;
      })
      .filter(Boolean);
  };

  const typingUsernames = getTypingUsernames();

  if (typingUsernames.length === 0) return null;

  const displayText = () => {
    if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} is typing...`;
    } else if (typingUsernames.length === 2) {
      return `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
    } else {
      return `${typingUsernames.slice(0, -1).join(', ')} and ${typingUsernames[typingUsernames.length - 1]} are typing...`;
    }
  };

  return (
    <div className="typing-indicator">
      <div className="typing-text">
        {displayText()}
      </div>
      <div className="typing-animation">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};

export default TypingIndicator;