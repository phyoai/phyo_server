import { Request, Response } from 'express';
import Message from '../models/message';
import Conversation from '../models/conversation';
import { AuthenticatedRequest } from '../types';
import { uploadToS3, getFileTypeCategory } from '../services/s3';

interface SendMessageBody {
  conversationId: string;
  content?: string;
  messageType?: 'text' | 'image' | 'file';
  mediaUrl?: string;
  mediaKey?: string;
  fileName?: string;
  fileSize?: number;
}

interface SendMessageWithFileBody {
  conversationId: string;
  content?: string;
  fileUrl?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

interface GetMessagesParams {
  conversationId: string;
}

interface GetMessagesQuery {
  page?: string;
  limit?: string;
}

export const sendMessageWithFile = async (req: AuthenticatedRequest<{}, {}, SendMessageWithFileBody>, res: Response): Promise<void> => {
  try {
    const { conversationId, content, fileUrl, mediaUrl, fileName, fileSize, mimeType } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ message: 'Conversation ID is required' });
      return;
    }

    const uploadedFile = req.file as Express.MulterS3.File | undefined;
    const fallbackMediaUrl = fileUrl || mediaUrl;

    if (!uploadedFile && !fallbackMediaUrl) {
      res.status(400).json({ message: 'No file provided' });
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

    const mediaSource = uploadedFile
      ? {
          location: uploadedFile.location,
          key: uploadedFile.key,
          originalname: uploadedFile.originalname,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype
        }
      : {
          location: fallbackMediaUrl as string,
          key: undefined,
          originalname: fileName || 'shared-file',
          size: fileSize || 0,
          mimetype: mimeType || 'application/octet-stream'
        };

    const fileTypeCategory = getFileTypeCategory(mediaSource.mimetype);
    
    // Determine message type based on file category
    let messageType: 'image' | 'file' = 'file';
    if (fileTypeCategory === 'image') {
      messageType = 'image';
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      content,
      messageType,
      mediaUrl: mediaSource.location,
      mediaKey: mediaSource.key,
      fileName: mediaSource.originalname,
      fileSize: mediaSource.size,
      isDelivered: true,
      deliveredAt: new Date()
    });

    await newMessage.save();

    // Update conversation with last message info
    const lastMessageContent = messageType === 'image' ? '📷 Image' : '📎 File';
    if (content) {
      conversation.lastMessage = content;
    } else {
      conversation.lastMessage = lastMessageContent;
    }
    conversation.lastMessageTime = new Date();
    await conversation.save();

    // Populate sender information
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email username');

    res.status(201).json({
      message: 'Message with file sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message with file error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const sendMessage = async (req: AuthenticatedRequest<{}, {}, SendMessageBody>, res: Response): Promise<void> => {
  try {
    const { conversationId, content, messageType = 'text', mediaUrl, mediaKey, fileName, fileSize } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ message: 'Conversation ID is required' });
      return;
    }

    // Validate content based on message type
    if (messageType === 'text' && !content) {
      res.status(400).json({ message: 'Content is required for text messages' });
      return;
    }

    if ((messageType === 'image' || messageType === 'file') && !mediaUrl) {
      res.status(400).json({ message: 'Media URL is required for image/file messages' });
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
      messageType,
      mediaUrl,
      mediaKey,
      fileName,
      fileSize,
      isDelivered: true,
      deliveredAt: new Date()
    });

    await newMessage.save();

    // Update conversation with last message info
    const lastMessageContent = messageType === 'text' ? content : 
                              messageType === 'image' ? '📷 Image' : 
                              '📎 File';
    
    conversation.lastMessage = lastMessageContent;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    // Populate sender information
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email username');

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage
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
    message.readAt = new Date();
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

// ===== ADDITIONAL MESSAGE ENDPOINTS =====

// GET /api/messages - Get all messages for authenticated user
export const getAllMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get all conversations the user is part of
    const conversations = await Conversation.find({ participants: userId });
    const conversationIds = conversations.map(c => c._id);

    // Get all messages from these conversations
    const messages = await Message.find({ conversationId: { $in: conversationIds } })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('senderId', 'name email username')
      .populate('conversationId', 'name')
      .lean();

    res.status(200).json({
      message: 'Messages retrieved successfully',
      data: {
        total: messages.length,
        messages: messages
      }
    });
  } catch (error) {
    console.error('Get all messages error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 
