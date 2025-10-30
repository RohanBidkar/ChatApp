const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Search users by username
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchQuery, limit = 10 } = req.query;

    if (!searchQuery || searchQuery.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required (minimum 1 character)'
      });
    }

    const query = searchQuery.trim();
    const currentUserId = req.user.userId;

    // Search users by username (case-insensitive partial match)
    // Exclude the current user from search results
    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { 
        $regex: query, 
        $options: 'i' 
      }
    })
    .select('-password') // Exclude password field
    .limit(parseInt(limit))
    .sort({ isOnline: -1, lastSeen: -1 }); // Online users first, then by last seen

    res.json({
      success: true,
      data: {
        users,
        query: query,
        total: users.length
      },
      message: `Found ${users.length} users matching "${query}"`
    });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during user search'
    });
  }
});

// Get user profile
router.get('/profile/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username })
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      },
      message: 'User profile retrieved successfully'
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user profile'
    });
  }
});

// Get all online users
router.get('/online', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const onlineUsers = await User.find({
      _id: { $ne: currentUserId },
      isOnline: true
    })
    .select('-password')
    .sort({ username: 1 });

    res.json({
      success: true,
      data: {
        users: onlineUsers,
        total: onlineUsers.length
      },
      message: `Found ${onlineUsers.length} online users`
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching online users'
    });
  }
});

// Get user's chat contacts (users they've messaged before)
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Find all users that the current user has sent messages to or received messages from
    const Message = require('../models/Message');
    
    const messageContacts = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { recipient: currentUserId }
          ],
          type: 'private'
        }
      },
      {
        $group: {
          _id: null,
          userIds: {
            $addToSet: {
              $cond: [
                { $eq: ['$sender', currentUserId] },
                '$recipient',
                '$sender'
              ]
            }
          }
        }
      }
    ]);

    const contactIds = messageContacts.length > 0 ? messageContacts[0].userIds : [];

    const contacts = await User.find({
      _id: { $in: contactIds }
    })
    .select('-password')
    .sort({ isOnline: -1, lastSeen: -1 });

    res.json({
      success: true,
      data: {
        contacts,
        total: contacts.length
      },
      message: `Found ${contacts.length} contacts`
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching contacts'
    });
  }
});

module.exports = router;