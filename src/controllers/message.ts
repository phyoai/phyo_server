import { Request, Response } from 'express';
import Message from '../models/message';
import Conversation from '../models/conversation';
import { AuthenticatedRequest } from '../types';

interface SendMessageBody {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
}

interface GetMessagesParams {
  conversationId: string;
}

interface GetMessagesQuery {
  page?: string;
  limit?: string;
}

export const sendMessage = async (req: AuthenticatedRequest<{}, {}, SendMessageBody>, res: Response): Promise<void> => {
  try {
    const { conversationId, content, messageType = 'text' } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!conversationId || !content) {
      res.status(400).json({ message: 'Conversation ID and content are required' });
      return;
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId
    });

    if (!conversation) {
      res.status(403).json({ message: 'Access denied to this conversation' });
      return;
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      content,
      messageType
    });

    await newMessage.save();

    // Update conversation with last message info
    conversation.lastMessage = content;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getMessages = async (req: AuthenticatedRequest<GetMessagesParams, {}, {}, GetMessagesQuery>, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      res.status(403).json({ message: 'Access denied to this conversation' });
      return;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('senderId', 'name email username')
      .lean();

    const totalMessages = await Message.countDocuments({ conversationId });

    res.json({
      message: 'Messages retrieved successfully',
      data: {
        messages: messages.reverse(), // Reverse to get chronological order
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalMessages / limitNum),
          totalMessages,
          hasMore: skip + messages.length < totalMessages
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const markMessageAsRead = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId
    });

    if (!conversation) {
      res.status(403).json({ message: 'Access denied to this conversation' });
      return;
    }

    // Only allow marking messages as read if user is not the sender
    if (message.senderId === userId) {
      res.status(400).json({ message: 'Cannot mark your own message as read' });
      return;
    }

    message.isRead = true;
    await message.save();

    res.json({
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteMessage = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const message = await Message.findOne({
      _id: id,
      senderId: userId
    });

    if (!message) {
      res.status(404).json({ message: 'Message not found or access denied' });
      return;
    }

    await Message.findByIdAndDelete(id);

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 