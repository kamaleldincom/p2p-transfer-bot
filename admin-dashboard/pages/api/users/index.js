// pages/api/users/index.js
import dbConnect from '../../../lib/mongodb';
import { User } from '../../../models/schemas';

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === 'GET') {
      const users = await User.find({}).lean();
      return res.status(200).json(users);
    }

    if (req.method === 'PATCH') {
      const { userId, status, trustScore } = req.body;
      const user = await User.findOneAndUpdate(
        { userId },
        { status, trustScore },
        { new: true }
      ).lean();
      return res.status(200).json(user);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}