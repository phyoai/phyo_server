const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['visa', 'mastercard', 'upi', 'netbanking', 'wallet'],
    required: true
  },
  lastFourDigits: {
    type: String,
    required: true
  },
  cardHolderName: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: String,
    required: true
  },
  upiId: {
    type: String,
    default: null
  },
  bankName: {
    type: String,
    default: null
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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
paymentMethodSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
