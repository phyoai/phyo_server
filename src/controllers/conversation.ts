import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/conversation';
import { AuthenticatedRequest } from '../types';
import { user } from '../models/auth';

interface CreateConversationBody {
  participantId: string;
}

interface GetConversationsParams {
  userId: string;
}

export const createConversation = async (req: AuthenticatedRequest<{}, {}, CreateConversationBody>, res: Response): Promise<void> => {
  try {
    const { participantId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!participantId) {
      res.status(400).json({ message: 'Participant ID is required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      res.status(400).json({ message: 'Participant ID must be a valid user ID' });
      return;
    }

    if (userId === participantId) {
      res.status(400).json({ message: 'Cannot create conversation with yourself' });
      return;
    }

    const participant = await user.findById(participantId).select('_id').lean();
    if (!participant) {
      res.status(404).json({ message: 'Participant not found' });
      return;
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] }
    });

    if (existingConversation) {
      res.status(200).json({
        message: 'Conversation already exists',
        data: existingConversation
      });
      return;
    }

    const newConversation = new Conversation({
      participants: [userId, participantId]
    });

    await newConversation.save();

    res.status(201).json({
      message: 'Conversation created successfully',
      data: newConversation
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getUserConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const conversations = await Conversation.find({
      participants: userId
    })
    .sort({ lastMessageTime: -1, updatedAt: -1 })
    .populate('participants', 'name email username')
    .lean();

    res.json({
      message: 'Conversations retrieved successfully',
      data: conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getConversationById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Conversation ID must be valid' });
      return;
    }

    const conversation = await Conversation.findById(id)
      .populate('participants', 'name email username')
      .lean();

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    res.json({
      message: 'Conversation retrieved successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteConversation = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId
    });

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    await Conversation.findByIdAndDelete(id);

    res.json({
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 
