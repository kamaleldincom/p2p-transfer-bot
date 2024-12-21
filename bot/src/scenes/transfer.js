const { Scenes } = require('telegraf');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const { generateTransactionId, generateReferralCode } = require('../utils/helpers');

const transferScene = new Scenes.WizardScene(
  'transfer',
  // Check active transaction
  async (ctx) => {
    const activeTransaction = await Transaction.findOne({
      $or: [
        { 'initiator.userId': ctx.from.id.toString() },
        { 'recipient.userId': ctx.from.id.toString() }
      ],
      status: { $in: ['open', 'matched', 'proof_uploaded'] }
    });

    if (activeTransaction) {
      await ctx.reply('You already have an active transaction. Complete or cancel it before starting a new one.');
      return ctx.scene.leave();
    }

    ctx.session.transfer = {};
    await ctx.reply('How much would you like to transfer?');
    return ctx.wizard.next();
  },
  // Amount entry
  async (ctx) => {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('Please enter a valid amount greater than 0:');
      return;
    }

    ctx.session.transfer.amount = amount;
    await ctx.reply('Select destination country:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇦🇪 UAE', callback_data: 'UAE' }],
          [{ text: '🇸🇩 Sudan', callback_data: 'SDN' }],
          [{ text: '🇪🇬 Egypt', callback_data: 'EGY' }]
        ]
      }
    });
    return ctx.wizard.next();
  },
  // Destination country and rate
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    
    ctx.session.transfer.destinationCountry = ctx.callbackQuery.data;
    await ctx.reply('Enter your preferred exchange rate:\n1 [your currency] = ? [destination currency]');
    return ctx.wizard.next();
  },
  // Save rate and ask for notes
  async (ctx) => {
    const rate = parseFloat(ctx.message.text);
    if (isNaN(rate) || rate <= 0) {
      await ctx.reply('Please enter a valid rate:');
      return;
    }

    ctx.session.transfer.rate = rate;
    await ctx.reply('Add any notes about this transfer:\n(Optional - e.g., "Available until 6 PM")\n[Skip] or type note', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Skip', callback_data: 'skip_note' }]]
      }
    });
    return ctx.wizard.next();
  },
  // Confirm transfer details
  async (ctx) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'skip_note') {
      ctx.session.transfer.notes = '';
    } else {
      ctx.session.transfer.notes = ctx.message.text;
    }

    const transfer = ctx.session.transfer;
    await ctx.reply(`Transfer Summary:
📤 Sending: ${transfer.amount}
📥 Receiving: ${(transfer.amount * transfer.rate).toFixed(2)}
${transfer.notes ? `📝 Note: ${transfer.notes}` : ''}

Confirm?`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Confirm', callback_data: 'confirm' },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]
        ]
      }
    });
    return ctx.wizard.next();
  },
  // Create transaction and find matches
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    
    if (ctx.callbackQuery.data === 'cancel') {
      await ctx.reply('Transfer cancelled');
      return ctx.scene.leave();
    }

    if (ctx.callbackQuery.data.startsWith('match_')) {
        const matchId = ctx.callbackQuery.data.split('_')[1];
        const match = await Transaction.findById(matchId);
        
        // Update match status
        match.status = 'matched';
        match.recipient = {
          userId: ctx.from.id.toString(),
          amount: ctx.session.transfer.amount,
          currency: 'AED' // TODO: Make dynamic
        };
        match.timestamps.matched = new Date();
        await match.save();
      
        // Get partner details
        const partner = await User.findOne({ userId: match.initiator.userId });
        
        await ctx.reply(`Match confirmed! ✅
      Partner: @${partner.telegramUsername}
      Trust Score: ${partner.trustScore}
      
      You can now contact them directly.
      Use /complete when ready to upload proof.`);
        
        return ctx.scene.leave();
      }

    const transfer = ctx.session.transfer;
    const transactionId = generateTransactionId();
    
    try {
      const transaction = await Transaction.create({
        transactionId,
        initiator: {
          userId: ctx.from.id.toString(),
          amount: transfer.amount,
          currency: 'AED' // TODO: Make dynamic based on user's country
        },
        rate: transfer.rate,
        notes: transfer.notes,
        status: 'open',
        timestamps: {
          created: new Date()
        }
      });

      // Find matching partners
      const matches = await findMatches(ctx.from.id.toString(), transfer);
      if (matches.length === 0) {
        await ctx.reply('No matching requests found. Your request has been saved.');
        return ctx.scene.leave();
      }

      // Display matches
      const matchButtons = matches.map((match, index) => {
        return {
          text: `Match ${index + 1}: ${match.initiator.amount} ${match.initiator.currency} @ ${match.rate}`,
          callback_data: `match_${match._id}`
        };
      });

      await ctx.reply('Here are matching requests from your network:', {
        reply_markup: {
          inline_keyboard: [
            matchButtons.map(button => [button]), // Wrap each button in an array
            [{ text: 'Cancel Request', callback_data: 'cancel_request' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Transfer error:', error);
      await ctx.reply('An error occurred. Please try again.');
      return ctx.scene.leave();
    }
  }
);


async function findMatches(userId, transfer) {
  const user = await User.findOne({ userId });
  
  // Get network connections
  const validPartners = await getValidPartners(userId);
  
  // Find matching transactions
  const matches = await Transaction.find({
    'initiator.userId': { $in: [...validPartners.map(p => p.userId)] },
    status: 'open',
    // Add more matching criteria (amount range, rate, etc.)
  });

  return matches;
}

async function getValidPartners(userId) {
  const user = await User.findOne({ userId });
  const partners = [];

  if (user.referredBy !== 'MASTER') {
    const referrer = await User.findOne({ userId: user.referredBy });
    if (referrer) partners.push(referrer);
  }

  const referrals = await User.find({ referredBy: userId });
  partners.push(...referrals);

  const siblings = await User.find({ 
    referredBy: user.referredBy,
    userId: { $ne: userId }
  });
  partners.push(...siblings);

  return partners;
}

module.exports = transferScene;