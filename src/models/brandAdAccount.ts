import mongoose, { Schema, Document } from 'mongoose';

export interface IAdAccount {
  ad_account_id: string;
  name: string;
  currency: string;
}

export interface IBrandAdAccount {
  brand_id: string;
  platform: 'meta' | 'google' | 'twitter';
  meta_access_token?: string;
  meta_token_expires_at?: Date;
  business_id?: string;
  page_id?: string;
  page_name?: string;
  page_access_token?: string;
  ad_account_ids: IAdAccount[];
  connected_at: Date;
  is_active: boolean;
}

export interface BrandAdAccountDocument extends IBrandAdAccount, Document {}

const adAccountSchema = new Schema<IAdAccount>({
  ad_account_id: { type: String, required: true },
  name: { type: String, required: true },
  currency: { type: String, required: true, default: 'USD' }
}, { _id: false });

const brandAdAccountSchema = new Schema<BrandAdAccountDocument>({
  brand_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  platform: {
    type: String,
    enum: ['meta', 'google', 'twitter'],
    required: true
  },
  meta_access_token: {
    type: String,
    required: function(this: BrandAdAccountDocument) {
      return this.platform === 'meta';
    }
  },
  meta_token_expires_at: {
    type: Date,
    required: function(this: BrandAdAccountDocument) {
      return this.platform === 'meta';
    }
  },
  business_id: {
    type: String,
    required: false
  },
  page_id: {
    type: String,
    required: false
  },
  page_name: {
    type: String,
    required: false
  },
  page_access_token: {
    type: String,
    required: false
  },
  ad_account_ids: [adAccountSchema],
  connected_at: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
brandAdAccountSchema.index({ brand_id: 1, platform: 1 }, { unique: true });
brandAdAccountSchema.index({ is_active: 1 });

const BrandAdAccount = mongoose.model<BrandAdAccountDocument>('BrandAdAccount', brandAdAccountSchema);

export default BrandAdAccount;
