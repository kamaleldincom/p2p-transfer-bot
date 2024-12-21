import mongoose, { Schema } from 'mongoose';

// User Model
const UserSchema = new Schema({
  userId: String,
  telegramUsername: String,
  name: String,
  phone: String,
  country: String,
  trustScore: Number,
  completedTransactions: Number
});

// Transaction Model
const TransactionSchema = new Schema({
  transactionId: String,
  initiator: {
    userId: String,
    amount: Number,
    currency: String
  },
  recipient: {
    userId: String,
    amount: Number,
    currency: String
  },
  status: String,
  reports: [{
    userId: String,
    reason: String,
    details: String,
    timestamp: Date
  }]
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);