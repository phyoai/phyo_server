import mongoose from 'mongoose';

export const connectToMongo = async (URL: string): Promise<typeof mongoose> => {
  try {
    return await mongoose.connect(URL);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}; 