import { Server as SocketIOServer, Socket } from 'socket.io';
import Message from './models/message';
import Conversation from './models/conversation';
import { user } from './models/auth';
import { getFileTypeCategory } from './services/s3';

interface SocketWithUserId extends Socket {
  userId?: string;
}

interface MessageData {
  sender: string;
  content?: string;
  conversationId: string;
  mediaUrl?: string;
  mediaKey?: string;
  fileName?: string;
  fileSize?: number;
  messageType?: 'text' | 'image' | 'file';
  mimeType?: string;
}

interface SeenMessageData {
  messageId: string;
  userId: string;
}

interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

const socketHandler = (io: SocketIOServer): void => {
  io.on('connection', async (socket: SocketWithUserId) => {
    const userId = socket.handshake.query.userId as string;
    socket.userId = userId;
    
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} connected`);
      
      // Update user online status
      try {
        await user.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
          socketId: socket.id
        });
        
        // Notify all conversations about user coming online
        const conversations = await Conversation.find({
          participants: userId
        });
        
        conversations.forEach(conversation => {
          socket.to(String(conversation._id)).emit('userOnline', {
            userId,
            isOnline: true
          });
        });
      } catch (error) {
        console.error('Error updating user online status:', error);
      }
    }

    socket.on('joinConversation', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on('leaveConversation', (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    socket.on('sendMessage', async (data: MessageData) => {
      try {
        const { 
          sender, 
          content, 
          conversationId, 
          mediaUrl, 
          mediaKey, 
          fileName, 
          fileSize, 
          messageType = 'text',
          mimeType 
        } = data;
        
        // Determine message type based on content and file data
        let finalMessageType: 'text' | 'image' | 'file' = messageType;
        if (mediaUrl && mimeType) {
          const fileCategory = getFileTypeCategory(mimeType);
          finalMessageType = fileCategory === 'image' ? 'image' : 'file';
        }

        // Create new message
        const message = await Message.create({ 
          senderId: sender, 
          content, 
          conversationId, 
          mediaUrl,
          mediaKey,
          fileName,
          fileSize,
          messageType: finalMessageType,
          isDelivered: true,
          deliveredAt: new Date()
        });

        // Update conversation with last message info
        let lastMessageContent = content;
        if (!content) {
          lastMessageContent = finalMessageType === 'image' ? '📷 Image' : 
                             finalMessageType === 'file' ? '📎 File' : '';
        }
        
        await Conversation.findByIdAndUpdate(conversationId, { 
          lastMessage: lastMessageContent,
          lastMessageTime: new Date(),
          updatedAt: new Date() 
        });

        // Populate sender information for the response
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name email username');

        // Emit to all users in the conversation
        io.to(conversationId).emit('receiveMessage', populatedMessage);
        console.log(`Message sent in conversation ${conversationId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', { 
          error: 'Failed to send message',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('seenMessage', async ({ messageId, userId }: SeenMessageData) => {
      try {
        await Message.findByIdAndUpdate(messageId, { 
          isRead: true,
          readAt: new Date()
        });
        
        // Notify other participants that message was seen
        const message = await Message.findById(messageId);
        if (message) {
          io.to(message.conversationId).emit('messageSeen', { 
            messageId, 
            userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as seen:', error);
      }
    });

    socket.on('typing', ({ conversationId, isTyping }: TypingData) => {
      socket.to(conversationId).emit('userTyping', {
        userId,
        isTyping
      });
    });

    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);
      
      if (userId) {
        try {
          // Update user offline status
          await user.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
            socketId: null
          });
          
          // Notify all conversations about user going offline
          const conversations = await Conversation.find({
            participants: userId
          });
          
          conversations.forEach(conversation => {
            socket.to(String(conversation._id)).emit('userOffline', {
              userId,
              isOnline: false,
              lastSeen: new Date()
            });
          });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    });
  });
};

export default socketHandler; 