import mongoose, { Schema, Document } from 'mongoose';
import { IPortfolio, IPortfolioClient } from '../types';

export interface PortfolioDocument extends IPortfolio, Document {}

const portfolioClientSchema = new Schema<IPortfolioClient>({
  projectTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  servicesProvided: [{
    type: String,
    required: true,
    trim: true
  }],
  projectDuration: {
    type: String,
    required: true,
    trim: true
  },
  projectStatus: {
    type: String,
    enum: ['Completed', 'In Progress', 'On Hold', 'Cancelled'],
    required: true
  },
  projectDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  clientName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  budget: {
    type: Number,
    min: 0
  },
  images: [{
    type: String,
    trim: true
  }]
}, { _id: true });

const portfolioSchema = new Schema<PortfolioDocument>({
  serviceProviderId: {
    type: String,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  clients: [portfolioClientSchema]
}, {
  timestamps: true
});

// Add indexes for better query performance
portfolioSchema.index({ serviceProviderId: 1 });
portfolioSchema.index({ 'clients.projectStatus': 1 });

const Portfolio = mongoose.model<PortfolioDocument>('Portfolio', portfolioSchema);

export default Portfolio; 