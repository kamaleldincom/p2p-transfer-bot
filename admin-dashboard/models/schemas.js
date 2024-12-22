// models/schemas.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  trustScore: { type: Number, default: 20 },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' }
});

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  initiator: {
    userId: String,
    amount: Number
  },
  recipient: {
    userId: String,
    amount: Number
  },
  status: { type: String, default: 'open' }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);