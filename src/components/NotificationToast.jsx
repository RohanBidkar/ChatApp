import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import './NotificationToast.css';

const NotificationToast = () => {
  const [notifications, setNotifications] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const showNotification = (message, type = 'info') => {
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message, type }]);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    };

    const handleUserOnline = (data) => {
      showNotification(`👋 ${data.username} joined the chat`, 'success');
    };

    const handleUserOffline = (data) => {
      showNotification(`👋 ${data.username} left the chat`, 'info');
    };

    const handleUserJoinedRoom = (data) => {
      showNotification(`🏠 ${data.username} joined the room`, 'info');
    };

    const handleUserLeftRoom = (data) => {
      showNotification(`🚪 ${data.username} left the room`, 'info');
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('user_joined_room', handleUserJoinedRoom);
    socket.on('user_left_room', handleUserLeftRoom);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('user_joined_room', handleUserJoinedRoom);
      socket.off('user_left_room', handleUserLeftRoom);
    };
  }, [socket]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification toast-${notification.type}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;