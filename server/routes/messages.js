const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');

const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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

// Get private message history between current user and another user
router.get('/private/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user.userId;

    // Verify both users exist
    const currentUser = await User.findById(currentUserId);
    const otherUser = await User.findById(otherUserId);

    if (!currentUser || !otherUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'Users not found' 
      });
    }

    const messages = await Message.find({
      type: 'private',
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('sender', 'username socketId')
    .populate('recipient', 'username socketId')
    .lean();

    // Transform for frontend compatibility
    const transformedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      from: msg.senderUsername,
      fromId: msg.sender.socketId || msg.sender._id,
      toId: msg.recipient.socketId || msg.recipient._id,
      message: msg.content,
      timestamp: msg.createdAt,
      type: 'private'
    }));

    const total = await Message.countDocuments({
      type: 'private',
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    });

    res.json({
      success: true,
      data: {
        messages: transformedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get room message history
router.get('/room/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user.userId;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        error: 'Room not found' 
      });
    }

    // Check if user is a member of the room
    const isMember = room.members.some(member => member.user.toString() === currentUserId);
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not a member of this room' 
      });
    }

    const messages = await Message.find({
      type: 'room',
      roomId: roomId
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('sender', 'username socketId')
    .lean();

    // Transform for frontend compatibility
    const transformedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      from: msg.senderUsername,
      fromId: msg.sender.socketId || msg.sender._id,
      message: msg.content,
      timestamp: msg.createdAt,
      type: 'room',
      roomId: roomId
    }));

    const total = await Message.countDocuments({ type: 'room', roomId });

    res.json({
      success: true,
      data: {
        messages: transformedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get user's recent conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get recent private conversations
    const recentPrivateMessages = await Message.aggregate([
      {
        $match: {
          type: 'private',
          $or: [{ sender: user._id }, { recipient: user._id }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', user._id] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser'
      },
      {
        $project: {
          userId: '$otherUser._id',
          username: '$otherUser.username',
          lastMessage: '$lastMessage.content',
          lastMessageTime: '$lastMessage.createdAt',
          isOnline: '$otherUser.isOnline'
        }
      }
    ]);

    res.json({ 
      success: true, 
      data: { 
        conversations: recentPrivateMessages 
      } 
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;