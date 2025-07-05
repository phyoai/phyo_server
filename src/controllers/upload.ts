import { Request, Response } from 'express';
import { uploadToS3, deleteFromS3 } from '../services/s3';
import { AuthenticatedRequest } from '../types';
import Conversation from '../models/conversation';

interface UploadImageBody {
  conversationId: string;
}

export const uploadChatImage = async (req: AuthenticatedRequest<{}, {}, UploadImageBody>, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ message: 'Conversation ID is required' });
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

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const file = req.file as Express.MulterS3.File;
    
    const imageData = {
      url: file.location,
      key: file.key,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      conversationId,
      uploadedBy: userId
    };

    res.status(200).json({
      message: 'Image uploaded successfully',
      data: imageData
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteChatImage = async (req: AuthenticatedRequest<{ key: string }>, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!key) {
      res.status(400).json({ message: 'Image key is required' });
      return;
    }

    // Delete from S3
    await deleteFromS3(key);

    res.status(200).json({
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 