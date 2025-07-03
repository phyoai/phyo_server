import mongoose, { Schema, Document } from 'mongoose';
import { IInfluencer } from '../types';

export interface InfluencerDocument extends IInfluencer, Document {}

const influencerSchema = new Schema<InfluencerDocument>({
  name: { type: String, required: true },
  categoryInstagram: { type: String },
  categoryYouTube: { type: String },
  user_name: { type: String },
  city: { type: String },
  state: { type: String },
  language: { type: String },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  instagramData: {
    followers: { type: Number, default: 0 },
    link: { type: String },
    genderDistribution: [
      {
        gender: { type: String },
        distribution: { type: Number },
      }
    ],
    ageDistribution: [
      {
        age: { type: String },
        value: { type: Number },
      }
    ],
    audienceByCountry: [
      {
        category: { type: String },
        name: { type: String },
        value: { type: Number },
      }
    ],
    collaborationCharges: {
      reel: { type: Number },
      story: { type: Number },
      post: { type: Number },
      oneMonthDigitalRights: { type: Number },
    },
  },
  youtubeData: {
    followers: { type: Number, default: 0 },
    link: { type: String },
    genderDistribution: [
      {
        gender: { type: String },
        distribution: { type: Number },
      }
    ],
    ageDistribution: [
      {
        age: { type: String },
        value: { type: Number },
      }
    ],
    audienceByCountry: [
      {
        category: { type: String },
        name: { type: String },
        value: { type: Number },
      }
    ],
    collaborationCharges: {
      reel: { type: Number },
      story: { type: Number },
      post: { type: Number },
      oneMonthDigitalRights: { type: Number },
    },
  },
  averageLikes: { type: Number },
  averageViews: { type: Number },
  averageComments: { type: Number },
  averageEngagement: { type: Number },
  image: { type: String }
}, {
  timestamps: true
});

const Influencer = mongoose.model<InfluencerDocument>('influencer', influencerSchema);

export default Influencer; 