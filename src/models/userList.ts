import mongoose, { Schema, Document } from 'mongoose';

export interface IUserListItem {
  itemId: string;
  itemType: string;
  notes?: string;
  addedAt: Date;
}

export interface IUserList {
  userId: string;
  name: string;
  description?: string;
  items: IUserListItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserListDocument extends IUserList, Document {}

const userListItemSchema = new Schema<IUserListItem>({
  itemId: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const userListSchema = new Schema<UserListDocument>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  items: [userListItemSchema]
}, {
  timestamps: true
});

userListSchema.index({ userId: 1, name: 1 });

const UserList = mongoose.model<UserListDocument>('UserList', userListSchema);

export default UserList;
