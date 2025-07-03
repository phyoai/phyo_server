import mongoose, { Schema, Document } from 'mongoose';
import { IConversation } from '../types';

export interface ConversationDocument extends IConversation, Document {}

const conversationSchema = new Schema<ConversationDocument>({
  participants: [{ 
    type: String, 
    required: true,
    ref: 'User'
  }],
  lastMessage: { 
    type: String,
    trim: true
  },
  lastMessageTime: { 
    type: Date
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTime: -1 });

// Ensure participants array has at least 2 users and no duplicates
conversationSchema.pre('save', function(next) {
  if (this.participants.length < 2) {
    const error = new Error('Conversation must have at least 2 participants');
    return next(error);
  }
  
  // Remove duplicates
  this.participants = [...new Set(this.participants)];
  next();
});

const Conversation = mongoose.model<ConversationDocument>('Conversation', conversationSchema);

export default Conversation; 