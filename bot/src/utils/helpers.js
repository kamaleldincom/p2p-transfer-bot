const User = require('../models/user');

function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 6;
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  function generateTransactionId() {
    return 'TR' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  

  async function getValidPartners(userId) {
    // This function finds all valid trading partners in the network
    const user = await User.findOne({ userId });
    const partners = [];
  
    // Check referrer (unless user was referred by MASTER)
    if (user.referredBy !== 'MASTER') {
      const referrer = await User.findOne({ userId: user.referredBy });
      if (referrer) partners.push(referrer);
    }
  
    // Add all direct referrals (people this user referred)
    const referrals = await User.find({ referredBy: userId });
    partners.push(...referrals);
  
    // Add siblings (other users referred by the same referrer)
    const siblings = await User.find({ 
      referredBy: user.referredBy,
      userId: { $ne: userId }  // Exclude the current user
    });
    partners.push(...siblings);
  
    return partners;
  }
  

  module.exports = {
    generateReferralCode,
    generateTransactionId,
    getValidPartners
  };