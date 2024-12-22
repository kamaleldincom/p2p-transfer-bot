// pages/api/transactions/index.js
import dbConnect from '../../../lib/mongodb';
import { Transaction } from '../../../models/schemas';

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === 'GET') {
      const transactions = await Transaction.find({
        status: { $in: ['open', 'matched', 'proof_uploaded'] }
      }).lean();
      return res.status(200).json(transactions);
    }

    if (req.method === 'PATCH') {
      const { transactionId, status } = req.body;
      const transaction = await Transaction.findOneAndUpdate(
        { transactionId },
        { status },
        { new: true }
      ).lean();
      return res.status(200).json(transaction);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}