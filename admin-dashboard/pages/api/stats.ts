import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/transaction';
import User from '@/lib/models/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Fetch all statistics in parallel
    const [
      users,
      activeTransactions,
      disputes,
      recentTransactions
    ] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments({ 
        status: { $in: ['matched', 'proof_uploaded'] } 
      }),
      Transaction.countDocuments({ 
        'reports.0': { $exists: true } 
      }),
      Transaction.find()
        .sort({ 'timestamps.created': -1 })
        .limit(5)
        .select('transactionId initiator.amount status')
    ]);

    res.json({
      users,
      activeTransactions,
      disputes,
      recentTransactions: recentTransactions.map(tx => ({
        transactionId: tx.transactionId,
        amount: tx.initiator.amount,
        status: tx.status
      }))
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
}