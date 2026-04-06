import mongoose, { Schema, Document } from 'mongoose';
import { IInfluencer } from '../types';

export interface InfluencerDocument extends IInfluencer, Document {}

const influencerSchema = new Schema<InfluencerDocument>({
  name: { type: String, required: false, default: '' }, // Made optional with default
  categoryInstagram: { type: String },
  categoryYouTube: { type: String },
  user_name: { type: String },
  profile_name: { type: String },
  profile_pic_url: { type: String },
  biography: { type: String },
  is_verified: { type: Boolean, default: false },
  is_business: { type: Boolean, default: false },
  city: { type: String },
  state: { type: String },
  language: { type: String },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other'],
    required: false, // Made optional
    default: 'Other' // Default value
  },
  lastDemographicsFetch: { type: Date },
  instagramData: {
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    posts_count: { type: Number, default: 0 },
    avg_engagement: { type: Number, default: 0 },
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
    audienceByCity: [
      {
        name: { type: String },
        value: { type: Number },
      }
    ],
    languageDistribution: [
      {
        language: { type: String },
        value: { type: Number },
      }
    ],
    audienceQualityScore: { type: Number, default: 0 },
    fakeFollowersPercent: { type: Number, default: 0 },
    totalCommentsAnalyzed: { type: Number, default: 0 },
    realUsersAnalyzed: { type: Number, default: 0 },
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