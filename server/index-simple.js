require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Configure CORS for both Express and Socket.io
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Simple in-memory storage for testing
const users = new Map();
const rooms = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.io Connection Handler (Simplified)
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Handle user joining the chat
  socket.on('user_join', (userData) => {
    try {
      const { username } = userData;
      
      // Store user information in memory
      users.set(socket.id, {
        socketId: socket.id,
        username: username,
        currentRoom: null,
        joinedAt: new Date()
      });

      console.log(`👋 ${username} joined the chat`);
      
      // Send welcome message to the user
      socket.emit('user_joined', {
        message: `Welcome to the chat, ${username}!`,
        userId: socket.id
      });

      // Broadcast to all other users that someone joined
      socket.broadcast.emit('user_online', {
        username: username,
        userId: socket.id
      });

      // Send list of online users to the new user
      const onlineUsers = Array.from(users.values())
        .filter(user => user.socketId !== socket.id)
        .map(user => ({
          username: user.username,
          userId: user.socketId
        }));
      
      socket.emit('online_users', onlineUsers);

    } catch (error) {
      console.error('❌ Error in user_join:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle private messages (Solo Chat)
  socket.on('private_message', (data) => {
    try {
      const { targetUserId, message } = data;
      const sender = users.get(socket.id);
      
      if (sender && users.has(targetUserId)) {
        const messageData = {
          from: sender.username,
          fromId: socket.id,
          toId: targetUserId,
          message: message,
          timestamp: new Date().toISOString(),
          type: 'private'
        };

        // Send to target user
        socket.to(targetUserId).emit('receive_message', messageData);
        
        // Send back to sender for confirmation
        socket.emit('message_sent', messageData);
        
        console.log(`💬 Private message from ${sender.username} to ${users.get(targetUserId).username}`);
      }
    } catch (error) {
      console.error('❌ Error in private_message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle joining a room (Group Chat)
  socket.on('join_room', (data) => {
    try {
      const { roomId, roomName } = data;
      const user = users.get(socket.id);
      
      if (user) {
        // Leave current room if in one
        if (user.currentRoom) {
          socket.leave(user.currentRoom);
          if (rooms.has(user.currentRoom)) {
            rooms.get(user.currentRoom).users.delete(socket.id);
          }
        }

        // Join new room
        socket.join(roomId);
        user.currentRoom = roomId;

        // Create room if it doesn't exist
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            name: roomName || roomId,
            users: new Set()
          });
        }

        // Add user to room
        rooms.get(roomId).users.add(socket.id);

        console.log(`🏠 ${user.username} joined room: ${roomId}`);

        // Notify user they joined the room
        socket.emit('room_joined', {
          roomId: roomId,
          roomName: rooms.get(roomId).name
        });

        // Notify others in the room
        socket.to(roomId).emit('user_joined_room', {
          username: user.username,
          userId: socket.id,
          roomId: roomId
        });

        // Send room member list to the user
        const roomUsers = Array.from(rooms.get(roomId).users)
          .map(userId => users.get(userId))
          .filter(user => user && user.socketId !== socket.id)
          .map(user => ({
            username: user.username,
            userId: user.socketId
          }));

        socket.emit('room_users', roomUsers);
      }
    } catch (error) {
      console.error('❌ Error in join_room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle room messages (Group Chat)
  socket.on('room_message', (data) => {
    try {
      const { roomId, message } = data;
      const sender = users.get(socket.id);
      
      if (sender && sender.currentRoom === roomId) {
        const messageData = {
          from: sender.username,
          fromId: socket.id,
          message: message,
          timestamp: new Date().toISOString(),
          type: 'room',
          roomId: roomId
        };

        // Send to all users in the room (including sender)
        io.to(roomId).emit('receive_message', messageData);
        
        console.log(`🗣️ Room message in ${roomId} from ${sender.username}`);
      }
    } catch (error) {
      console.error('❌ Error in room_message:', error);
      socket.emit('error', { message: 'Failed to send room message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const sender = users.get(socket.id);
    if (sender) {
      if (data.type === 'private' && data.targetUserId) {
        socket.to(data.targetUserId).emit('user_typing', {
          username: sender.username,
          userId: socket.id,
          type: 'private'
        });
      } else if (data.type === 'room' && data.roomId && sender.currentRoom === data.roomId) {
        socket.to(data.roomId).emit('user_typing', {
          username: sender.username,
          userId: socket.id,
          type: 'room',
          roomId: data.roomId
        });
      }
    }
  });

  socket.on('typing_stop', (data) => {
    const sender = users.get(socket.id);
    if (sender) {
      if (data.type === 'private' && data.targetUserId) {
        socket.to(data.targetUserId).emit('user_stopped_typing', {
          userId: socket.id,
          type: 'private'
        });
      } else if (data.type === 'room' && data.roomId && sender.currentRoom === data.roomId) {
        socket.to(data.roomId).emit('user_stopped_typing', {
          userId: socket.id,
          type: 'room',
          roomId: data.roomId
        });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    try {
      const user = users.get(socket.id);
      
      if (user) {
        console.log(`👋 ${user.username} disconnected`);
        
        // Remove from current room if in one
        if (user.currentRoom && rooms.has(user.currentRoom)) {
          const room = rooms.get(user.currentRoom);
          room.users.delete(socket.id);
          
          // Notify room members
          socket.to(user.currentRoom).emit('user_left_room', {
            username: user.username,
            userId: socket.id,
            roomId: user.currentRoom
          });
          
          // Delete room if empty
          if (room.users.size === 0) {
            rooms.delete(user.currentRoom);
          }
        }
        
        // Remove user from users map
        users.delete(socket.id);
        
        // Notify all users that this user went offline
        socket.broadcast.emit('user_offline', {
          username: user.username,
          userId: socket.id
        });
      }
    } catch (error) {
      console.error('❌ Error in disconnect:', error);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Running in simplified mode (in-memory storage)`);
});