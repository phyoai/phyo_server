import mongoose, { Schema, Document } from 'mongoose';
import { IProject } from '../types';

export interface ProjectDocument extends IProject, Document {}

const projectSchema = new Schema<ProjectDocument>({
  serviceProviderId: {
    type: String,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  progressPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Planning'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
projectSchema.index({ serviceProviderId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ date: -1 });

const Project = mongoose.model<ProjectDocument>('Project', projectSchema);

export default Project; 