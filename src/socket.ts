import { Server as SocketIOServer, Socket } from 'socket.io';
import Message from './models/message';
import Conversation from './models/conversation';

interface SocketWithUserId extends Socket {
  userId?: string;
}

interface MessageData {
  sender: string;
  content: string;
  conversationId: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'file';
}

interface SeenMessageData {
  messageId: string;
  userId: string;
}

const socketHandler = (io: SocketIOServer): void => {
  io.on('connection', (socket: SocketWithUserId) => {
    const userId = socket.handshake.query.userId as string;
    socket.userId = userId;
    
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} connected`);
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
        const { sender, content, conversationId, mediaUrl, mediaType = 'text' } = data;
        
        // Create new message
        const message = await Message.create({ 
          senderId: sender, 
          content, 
          conversationId, 
          mediaUrl, 
          messageType: mediaType 
        });

        // Update conversation with last message info
        await Conversation.findByIdAndUpdate(conversationId, { 
          lastMessage: content,
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
          isRead: true 
        });
        
        // Notify other participants that message was seen
        const message = await Message.findById(messageId);
        if (message) {
          io.to(message.conversationId).emit('messageSeen', { messageId, userId });
        }
      } catch (error) {
        console.error('Error marking message as seen:', error);
      }
    });

    socket.on('typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(conversationId).emit('userTyping', {
        userId,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });
};

export default socketHandler; 