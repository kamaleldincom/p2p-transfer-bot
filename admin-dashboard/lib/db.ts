import { connect, connection } from 'mongoose';
import User from './models/user';
import Transaction from './models/transaction';

export async function connectDB() {
  if (connection.readyState >= 1) return;
  return connect(process.env.MONGODB_URI!);
}

export async function getDashboardStats() {
  await connectDB();
  const [users, transactions, disputes] = await Promise.all([
    User.countDocuments(),
    Transaction.countDocuments({ status: { $in: ['matched', 'proof_uploaded'] } }),
    Transaction.countDocuments({ 'reports.0': { $exists: true } })
  ]);
  
  return { users, activeTransactions: transactions, disputes };
}