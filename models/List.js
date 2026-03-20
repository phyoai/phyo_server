const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  influencers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'influencer'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
listSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('List', listSchema);
