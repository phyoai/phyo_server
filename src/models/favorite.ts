import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite {
  userId: string;
  type: 'campaign' | 'influencer' | 'brand';
  itemId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FavoriteDocument extends IFavorite, Document {}

const favoriteSchema = new Schema<FavoriteDocument>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  type: {
    type: String,
    enum: ['campaign', 'influencer', 'brand'],
    required: true
  },
  itemId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

favoriteSchema.index({ userId: 1, type: 1 });
favoriteSchema.index({ userId: 1, itemId: 1, type: 1 }, { unique: true });

const Favorite = mongoose.model<FavoriteDocument>('Favorite', favoriteSchema);

export default Favorite;
