import mongoose, { Schema, Document } from 'mongoose';

export interface INotification {
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<NotificationDocument>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model<NotificationDocument>('Notification', notificationSchema);

export default Notification;
