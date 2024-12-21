import mongoose from 'mongoose';

// Define interfaces for nested structures
interface IProof {
  userId: string;
  imageId: string;
  uploadedAt: Date;
}

interface IReport {
  userId: string;
  reason: string;
  details: string;
  timestamp: Date;
  status: 'pending' | 'resolved';
}

interface IParty {
  userId: string;
  amount: number;
  currency: string;
}

interface ITimestamps {
  created?: Date;
  matched?: Date;
  completed?: Date;
}

// Main Transaction interface
interface ITransaction extends mongoose.Document {
  transactionId: string;
  initiator: IParty;
  recipient?: IParty;
  rate: number;
  status: 'open' | 'matched' | 'proof_uploaded' | 'completed' | 'cancelled';
  notes?: string;
  relationship?: 'referrer' | 'referee' | 'sibling';
  proofs: IProof[];
  timestamps: ITimestamps;
  reports: IReport[];
}

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
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
  rate: Number,
  status: {
    type: String,
    enum: ['open', 'matched', 'proof_uploaded', 'completed', 'cancelled'],
    default: 'open'
  },
  notes: String,
  relationship: {
    type: String,
    enum: ['referrer', 'referee', 'sibling']
  },
  proofs: [{
    userId: String,
    imageId: String,
    uploadedAt: Date
  }],
  timestamps: {
    created: Date,
    matched: Date,
    completed: Date
  },
  reports: [{
    userId: String,
    reason: String,
    details: String,
    timestamp: Date,
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending'
    }
  }]
});

const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;