import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserListItem {
  _id?: Types.ObjectId;
  itemId: string;
  itemType: string;
  status?: string;
  notes?: string;
  addedAt: Date;
  updatedAt?: Date;
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
    required: true,
    trim: true
  },
  itemType: {
    type: String,
    required: true,
    trim: true,
    default: 'influencer'
  },
  status: {
    type: String,
    trim: true,
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
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
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  items: [userListItemSchema]
}, {
  timestamps: true
});

userListSchema.index({ userId: 1, name: 1 });

const UserList = mongoose.model<UserListDocument>('UserList', userListSchema);

export default UserList;
