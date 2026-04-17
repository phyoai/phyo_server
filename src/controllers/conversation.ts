import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/conversation';
import { AuthenticatedRequest } from '../types';
import { user } from '../models/auth';

interface CreateConversationBody {
  participantId?: string;
  participantIds?: string[];
}

interface GetConversationsParams {
  userId: string;
}

export const createConversation = async (req: AuthenticatedRequest<{}, {}, CreateConversationBody>, res: Response): Promise<void> => {
  try {
    const { participantId, participantIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const requestedParticipantIds = [
      ...(typeof participantId === 'string' ? [participantId] : []),
      ...(Array.isArray(participantIds) ? participantIds : [])
    ]
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean);

    if (requestedParticipantIds.length === 0) {
      res.status(400).json({ message: 'At least one participant ID is required' });
      return;
    }

    const uniqueRequestedParticipantIds = [...new Set(requestedParticipantIds)];
    const otherParticipantIds = uniqueRequestedParticipantIds.filter((id) => id !== userId);

    if (otherParticipantIds.length === 0) {
      res.status(400).json({ message: 'Cannot create conversation with yourself' });
      return;
    }

    const invalidParticipantIds = otherParticipantIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidParticipantIds.length > 0) {
      res.status(400).json({
        message: 'All participant IDs must be valid user IDs',
        invalidParticipantIds
      });
      return;
    }

    const existingParticipants = await user.find({ _id: { $in: otherParticipantIds } }).select('_id').lean();
    if (existingParticipants.length !== otherParticipantIds.length) {
      const existingParticipantIds = new Set(existingParticipants.map((participant) => String(participant._id)));
      const missingParticipantIds = otherParticipantIds.filter((id) => !existingParticipantIds.has(id));

      res.status(404).json({
        message: 'One or more participants were not found',
        missingParticipantIds
      });
      return;
    }

    const allParticipants = [userId, ...otherParticipantIds];

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: allParticipants },
      $expr: { $eq: [{ $size: '$participants' }, allParticipants.length] }
    });

    if (existingConversation) {
      res.status(200).json({
        message: 'Conversation already exists',
        data: existingConversation
      });
      return;
    }

    const newConversation = new Conversation({
      participants: allParticipants
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
