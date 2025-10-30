const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['private', 'room'],
    required: true
  },
  // For private messages
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'private';
    }
  },
  recipientUsername: {
    type: String,
    required: function() {
      return this.type === 'private';
    }
  },
  // For room messages
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: function() {
      return this.type === 'room';
    }
  },
  roomId: {
    type: String,
    required: function() {
      return this.type === 'room';
    }
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);