const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// In-memory storage for testing (replace with database in production)
const users = new Map(); // username -> {id, username, password, email, isOnline, lastSeen}
const messages = [];
const onlineUsers = new Map(); // socketId -> userData
const rooms = new Map(); // roomId -> {name, users: Set}

// JWT Secret
const JWT_SECRET = 'test-secret-key';

// Configure CORS
const corsOrigins = ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Helper function to generate user ID
const generateUserId = () => Math.random().toString(36).substr(2, 9);

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 2 and 20 characters'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    if (users.has(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = generateUserId();
    const user = {
      id: userId,
      username: username.trim(),
      password: hashedPassword,
      email: email?.trim() || '',
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date()
    };

    users.set(username, user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user
    const user = users.get(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last seen
    user.lastSeen = new Date();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword
    },
    message: 'Token is valid'
  });
});

// User search routes
app.get('/api/users/search', authenticateToken, (req, res) => {
  try {
    const { q: searchQuery, limit = 10 } = req.query;

    if (!searchQuery || searchQuery.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required (minimum 1 character)'
      });
    }

    const query = searchQuery.trim().toLowerCase();
    const currentUsername = req.user.username;

    // Search users (exclude current user)
    const searchResults = Array.from(users.values())
      .filter(user => 
        user.username !== currentUsername && 
        user.username.toLowerCase().includes(query)
      )
      .slice(0, parseInt(limit))
      .map(user => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      })
      .sort((a, b) => b.isOnline - a.isOnline); // Online users first

    res.json({
      success: true,
      data: {
        users: searchResults,
        query: searchQuery,
        total: searchResults.length
      },
      message: `Found ${searchResults.length} users matching "${searchQuery}"`
    });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during user search'
    });
  }
});

app.get('/api/users/online', authenticateToken, (req, res) => {
  try {
    const currentUsername = req.user.username;

    const onlineUsersList = Array.from(users.values())
      .filter(user => user.username !== currentUsername && user.isOnline)
      .map(user => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      })
      .sort((a, b) => a.username.localeCompare(b.username));

    res.json({
      success: true,
      data: {
        users: onlineUsersList,
        total: onlineUsersList.length
      },
      message: `Found ${onlineUsersList.length} online users`
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching online users'
    });
  }
});

app.get('/api/users/contacts', authenticateToken, (req, res) => {
  try {
    // For simplified version, return empty contacts
    // In full version, this would query message history
    res.json({
      success: true,
      data: {
        contacts: [],
        total: 0
      },
      message: 'Found 0 contacts'
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching contacts'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    users: users.size,
    onlineUsers: onlineUsers.size
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('user_join', (userData) => {
    try {
      const { username } = userData;
      
      // Update user online status
      if (users.has(username)) {
        const user = users.get(username);
        user.isOnline = true;
        user.socketId = socket.id;
        user.lastSeen = new Date();
      }

      // Store online user
      onlineUsers.set(socket.id, { 
        userId: username, 
        username, 
        socketId: socket.id 
      });

      socket.emit('user_joined', {
        success: true,
        message: `Welcome ${username}!`,
        user: { userId: username, username }
      });

      // Broadcast to other users
      socket.broadcast.emit('user_online', {
        userId: username,
        username
      });

      // Send updated online users list
      const onlineUsersList = Array.from(onlineUsers.values());
      io.emit('online_users_updated', onlineUsersList);

      console.log(`✅ User ${username} joined chat`);
    } catch (error) {
      console.error('Error handling user_join:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  socket.on('disconnect', () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      // Update user offline status
      if (users.has(userData.username)) {
        const user = users.get(userData.username);
        user.isOnline = false;
        user.lastSeen = new Date();
      }

      onlineUsers.delete(socket.id);
      
      socket.broadcast.emit('user_offline', {
        userId: userData.userId,
        username: userData.username
      });

      // Send updated online users list
      const onlineUsersList = Array.from(onlineUsers.values());
      io.emit('online_users_updated', onlineUsersList);

      console.log(`❌ User ${userData.username} disconnected`);
    }
  });

  // Handle private messages
  socket.on('private_message', (data) => {
    try {
      const { targetUserId, message } = data;
      const sender = onlineUsers.get(socket.id);
      
      if (!sender) return;

      const messageData = {
        id: Date.now(),
        fromId: sender.userId,
        fromUsername: sender.username,
        toId: targetUserId,
        message,
        timestamp: new Date(),
        type: 'private'
      };

      messages.push(messageData);

      // Find target user's socket
      const targetSocket = Array.from(onlineUsers.entries())
        .find(([_, user]) => user.userId === targetUserId);

      if (targetSocket) {
        io.to(targetSocket[0]).emit('private_message_received', messageData);
      }

      socket.emit('private_message_sent', messageData);
      
    } catch (error) {
      console.error('Error handling private message:', error);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌍 Environment: development (simplified mode)`);
  console.log(`👥 In-memory storage active`);
});