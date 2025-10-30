require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

// Import models
const User = require('./models/User');
const Message = require('./models/Message');
const Room = require('./models/Room');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.io
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Middleware
app.use(express.json());

// API Routes
app.use('/api/messages', require('./routes/messages'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Keep-alive endpoint for free tier (prevents sleeping)
app.get('/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: Date.now() });
});

// Basic metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle React routing - serve index.html for all non-API routes
  // This catch-all route must be AFTER all API routes
  app.get('*', (req, res) => {
    // Skip API routes and socket.io routes
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || 
        req.path.startsWith('/health') || req.path.startsWith('/ping') || 
        req.path.startsWith('/metrics')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users and rooms
const users = new Map(); // userId -> {socketId, username, currentRoom} - kept for typing indicators
const rooms = new Map(); // roomId -> {name, users: Set} - kept for quick room access

// Memory cleanup for free tier (prevent memory leaks)
setInterval(() => {
  // Clean up disconnected users from memory every 10 minutes
  const now = Date.now();
  for (const [userId, userData] of users.entries()) {
    if (userData.lastSeen && (now - userData.lastSeen) > 600000) { // 10 minutes
      users.delete(userId);
    }
  }
  
  // Clean up empty rooms
  for (const [roomId, roomData] of rooms.entries()) {
    if (roomData.users && roomData.users.size === 0) {
      rooms.delete(roomId);
    }
  }
}, 600000); // Run every 10 minutes

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Handle user joining the chat
  socket.on('user_join', async (userData) => {
    try {
      const { username } = userData;
      
      // Find or create user in database
      let user = await User.findOne({ username });
      
      if (!user) {
        user = new User({
          username,
          socketId: socket.id,
          isOnline: true,
          lastSeen: new Date()
        });
        await user.save();
        console.log(`👤 New user created: ${username}`);
      } else {
        // Update existing user
        user.socketId = socket.id;
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        console.log(`🔄 User updated: ${username}`);
      }

      // Store user info in socket
      socket.userId = user._id;
      socket.username = username;

      console.log(`👋 ${username} joined the chat`);
      
      // Send welcome message to the user
      socket.emit('user_joined', {
        message: `Welcome to the chat, ${username}!`,
        userId: socket.id,
        dbUserId: user._id
      });

      // Get all online users
      const onlineUsers = await User.find({ isOnline: true, _id: { $ne: user._id } })
        .select('username socketId _id')
        .lean();

      // Send list of online users to the new user
      socket.emit('online_users', onlineUsers.map(u => ({
        username: u.username,
        userId: u.socketId,
        dbUserId: u._id
      })));

      // Broadcast to all other users that someone joined
      socket.broadcast.emit('user_online', {
        username: username,
        userId: socket.id,
        dbUserId: user._id
      });

    } catch (error) {
      console.error('❌ Error in user_join:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle private messages (Solo Chat)
  socket.on('private_message', async (data) => {
    try {
      const { targetUserId, message } = data;
      
      // Get sender info
      const sender = await User.findById(socket.userId);
      const recipient = await User.findOne({ socketId: targetUserId });
      
      if (!sender || !recipient) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Save message to database
      const newMessage = new Message({
        sender: sender._id,
        senderUsername: sender.username,
        recipient: recipient._id,
        recipientUsername: recipient.username,
        content: message,
        type: 'private'
      });

      await newMessage.save();

      const messageData = {
        _id: newMessage._id,
        from: sender.username,
        fromId: socket.id,
        toId: targetUserId,
        message: message,
        timestamp: newMessage.createdAt,
        type: 'private'
      };

      // Send to target user
      socket.to(targetUserId).emit('receive_message', messageData);
      
      // Send back to sender for confirmation
      socket.emit('message_sent', messageData);
      
      console.log(`💬 Private message from ${sender.username} to ${recipient.username}`);

    } catch (error) {
      console.error('❌ Error in private_message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle joining a room (Group Chat)
  socket.on('join_room', async (data) => {
    try {
      const { roomId, roomName } = data;
      const user = await User.findById(socket.userId);
      
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Leave current room if in one
      if (user.currentRoom) {
        socket.leave(user.currentRoom);
      }

      // Find or create room
      let room = await Room.findOne({ roomId });
      
      if (!room) {
        room = new Room({
          roomId,
          name: roomName || roomId,
          creator: user._id,
          members: [{
            user: user._id,
            role: 'admin',
            joinedAt: new Date()
          }]
        });
        await room.save();
        console.log(`🏠 New room created: ${roomId} by ${user.username}`);
      } else {
        // Add user to room if not already a member
        const isMember = room.members.some(member => member.user.toString() === user._id.toString());
        if (!isMember) {
          room.members.push({
            user: user._id,
            joinedAt: new Date()
          });
          await room.save();
        }
      }

      // Join room
      socket.join(roomId);
      user.currentRoom = roomId;
      await user.save();

      room.lastActivity = new Date();
      await room.save();

      console.log(`🏠 ${user.username} joined room: ${roomId}`);

      // Notify user they joined the room
      socket.emit('room_joined', {
        roomId: roomId,
        roomName: room.name
      });

      // Notify others in the room
      socket.to(roomId).emit('user_joined_room', {
        username: user.username,
        userId: socket.id,
        roomId: roomId
      });

      // Get room members
      const roomMembers = await Room.findOne({ roomId })
        .populate('members.user', 'username socketId')
        .lean();

      const activeMembers = roomMembers.members
        .filter(member => member.user.socketId && member.user.socketId !== socket.id)
        .map(member => ({
          username: member.user.username,
          userId: member.user.socketId,
          joinedAt: member.joinedAt
        }));

      socket.emit('room_users', activeMembers);

    } catch (error) {
      console.error('❌ Error in join_room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle room messages (Group Chat)
  socket.on('room_message', async (data) => {
    try {
      const { roomId, message } = data;
      
      const sender = await User.findById(socket.userId);
      const room = await Room.findOne({ roomId });
      
      if (!sender || !room) {
        socket.emit('error', { message: 'Room or user not found' });
        return;
      }

      // Check if user is a member of the room
      const isMember = room.members.some(member => member.user.toString() === sender._id.toString());
      if (!isMember) {
        socket.emit('error', { message: 'You are not a member of this room' });
        return;
      }

      // Save message to database
      const newMessage = new Message({
        sender: sender._id,
        senderUsername: sender.username,
        room: room._id,
        roomId: roomId,
        content: message,
        type: 'room'
      });

      await newMessage.save();

      // Update room last activity
      room.lastActivity = new Date();
      await room.save();

      const messageData = {
        _id: newMessage._id,
        from: sender.username,
        fromId: socket.id,
        message: message,
        timestamp: newMessage.createdAt,
        type: 'room',
        roomId: roomId
      };

      // Send to all users in the room (including sender)
      io.to(roomId).emit('receive_message', messageData);
      
      console.log(`🗣️ Room message in ${roomId} from ${sender.username}`);

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
  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        const user = await User.findById(socket.userId);
        
        if (user) {
          console.log(`👋 ${user.username} disconnected`);
          
          // Update user status
          user.isOnline = false;
          user.lastSeen = new Date();
          user.socketId = null;
          await user.save();
          
          // Remove from current room if in one
          if (user.currentRoom) {
            const room = await Room.findOne({ roomId: user.currentRoom });
            if (room) {
              // Notify room members
              socket.to(user.currentRoom).emit('user_left_room', {
                username: user.username,
                userId: socket.id,
                roomId: user.currentRoom
              });
            }
            
            user.currentRoom = null;
            await user.save();
          }
          
          // Notify all users that this user went offline
          socket.broadcast.emit('user_offline', {
            username: user.username,
            userId: socket.id
          });
        }
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
});