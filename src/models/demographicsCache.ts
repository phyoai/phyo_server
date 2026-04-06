import mongoose, { Schema, Document } from 'mongoose';

export interface IDemographicsCache {
  username: string;
  payload: object; // Store the full demographics response as an object
  updated_at: Date;
  updated_at_epoch: number;
}

export interface DemographicsCacheDocument extends IDemographicsCache, Document {}

const demographicsCacheSchema = new Schema<DemographicsCacheDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  updated_at_epoch: {
    type: Number,
    default: () => Date.now()
  }
});

const DemographicsCache = mongoose.model<DemographicsCacheDocument>(
  'DemographicsCache',
  demographicsCacheSchema,
  'demographics_cache'
);

export default DemographicsCache;



