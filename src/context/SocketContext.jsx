import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    // Determine server URL based on environment
    const serverUrl = import.meta.env.VITE_SOCKET_URL || 
      (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

    // Initialize socket connection
    const newSocket = io(serverUrl, {
      autoConnect: false, // We'll connect manually after user provides username
      transports: ['websocket', 'polling'], // Fallback for production
      upgrade: true,
      rememberUpgrade: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setConnected(false);
    });

    // User events
    newSocket.on('user_joined', (data) => {
      console.log('✅ Successfully joined chat:', data.message);
      setUser({ username: user?.username, userId: data.userId });
    });

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users.filter(u => u.userId !== newSocket.id));
    });

    newSocket.on('user_online', (userData) => {
      setOnlineUsers(prev => [...prev, userData]);
    });

    newSocket.on('user_offline', (userData) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== userData.userId));
    });

    // Message events
    newSocket.on('receive_message', (messageData) => {
      setMessages(prev => [...prev, messageData]);
    });

    newSocket.on('message_sent', (messageData) => {
      setMessages(prev => [...prev, messageData]);
    });

    // Room events
    newSocket.on('room_joined', (data) => {
      console.log('🏠 Joined room:', data.roomName);
      setCurrentRoom(data);
      setMessages([]); // Clear messages when switching rooms
    });

    newSocket.on('room_users', (users) => {
      setRoomUsers(users.filter(u => u.userId !== newSocket.id));
    });

    newSocket.on('user_joined_room', (userData) => {
      setRoomUsers(prev => [...prev, userData]);
    });

    newSocket.on('user_left_room', (userData) => {
      setRoomUsers(prev => prev.filter(u => u.userId !== userData.userId));
    });

    // Typing events
    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => new Set([...prev, data.userId]));
    });

    newSocket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Connect user to chat
  const connectUser = (username) => {
    if (socket && username.trim()) {
      setUser({ username: username.trim() });
      socket.connect();
      socket.emit('user_join', { username: username.trim() });
    }
  };

  // Disconnect user
  const disconnectUser = () => {
    if (socket) {
      socket.disconnect();
      setUser(null);
      setCurrentRoom(null);
      setMessages([]);
      setOnlineUsers([]);
      setRoomUsers([]);
      setTypingUsers(new Set());
    }
  };

  // Send private message
  const sendPrivateMessage = (targetUserId, message) => {
    if (socket && message.trim()) {
      socket.emit('private_message', {
        targetUserId,
        message: message.trim()
      });
    }
  };

  // Join room
  const joinRoom = (roomId, roomName) => {
    if (socket) {
      socket.emit('join_room', { roomId, roomName });
    }
  };

  // Send room message
  const sendRoomMessage = (message) => {
    if (socket && currentRoom && message.trim()) {
      socket.emit('room_message', {
        roomId: currentRoom.roomId,
        message: message.trim()
      });
    }
  };

  // Typing indicators
  const startTyping = (type, targetId = null) => {
    if (socket) {
      if (type === 'private') {
        socket.emit('typing_start', { type: 'private', targetUserId: targetId });
      } else if (type === 'room' && currentRoom) {
        socket.emit('typing_start', { type: 'room', roomId: currentRoom.roomId });
      }
    }
  };

  const stopTyping = (type, targetId = null) => {
    if (socket) {
      if (type === 'private') {
        socket.emit('typing_stop', { type: 'private', targetUserId: targetId });
      } else if (type === 'room' && currentRoom) {
        socket.emit('typing_stop', { type: 'room', roomId: currentRoom.roomId });
      }
    }
  };

  // Start a private chat with a user
  const startPrivateChat = (username) => {
    // Find the user in online users or create a minimal user object
    const existingUser = onlineUsers.find(u => u.username === username);
    if (existingUser) {
      // User is online, we can start the chat directly
      return existingUser;
    } else {
      // User might not be online, but we can still create a chat
      // This will be handled when they come online or when we load message history
      console.log(`Starting private chat with ${username}`);
      return {
        userId: username, // Use username as temporary ID
        username: username,
        isOnline: false
      };
    }
  };

  const value = {
    socket,
    connected,
    user,
    onlineUsers,
    messages,
    currentRoom,
    roomUsers,
    typingUsers,
    connectUser,
    disconnectUser,
    sendPrivateMessage,
    joinRoom,
    sendRoomMessage,
    startTyping,
    stopTyping,
    startPrivateChat,
    setMessages
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};