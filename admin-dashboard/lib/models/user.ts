import mongoose from 'mongoose';

// Define the interface for User document
interface IUser extends mongoose.Document {
  userId: string;
  telegramUsername?: string;
  name: string;
  phone: string;
  identificationNumber?: string;
  country: 'UAE' | 'SDN' | 'EGY';
  referralCode: string;
  referredBy: string;
  trustScore: number;
  completedTransactions: number;
  createdAt: Date;
  status: 'active' | 'suspended';
}

// Create the schema matching your existing one
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  telegramUsername: String,
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  identificationNumber: String,
  country: {
    type: String,
    required: true,
    enum: ['UAE', 'SDN', 'EGY']
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  referredBy: {
    type: String,
    required: true
  },
  trustScore: {
    type: Number,
    default: 20
  },
  completedTransactions: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
});

// Export the model with type safety
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;