const { Scenes } = require('telegraf');
const Transaction = require('../models/transaction');

const reportScene = new Scenes.WizardScene(
  'report',
  // Step 1: Select issue type
  async (ctx) => {
    const transaction = await Transaction.findOne({
      $or: [
        { 'initiator.userId': ctx.from.id.toString() },
        { 'recipient.userId': ctx.from.id.toString() }
      ],
      status: { $in: ['matched', 'proof_uploaded'] }
    });

    if (!transaction) {
      await ctx.reply('No active transaction to report.');
      return ctx.scene.leave();
    }

    ctx.session.reportTransaction = transaction;
    await ctx.reply('Select issue type:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'No response', callback_data: 'no_response' }],
          [{ text: 'Payment issue', callback_data: 'payment_issue' }],
          [{ text: 'Wrong amount', callback_data: 'wrong_amount' }],
          [{ text: 'Other', callback_data: 'other' }]
        ]
      }
    });
    return ctx.wizard.next();
  },
  // Step 2: Get details
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    
    ctx.session.reportType = ctx.callbackQuery.data;
    await ctx.reply('Please provide details about the issue:');
    return ctx.wizard.next();
  },
  // Step 3: Save report
  async (ctx) => {
    const transaction = ctx.session.reportTransaction;
    
    transaction.reports.push({
      userId: ctx.from.id.toString(),
      reason: ctx.session.reportType,
      details: ctx.message.text,
      timestamp: new Date()
    });
    
    await transaction.save();

    // Notify admins (you'll need to implement this)
    // await notifyAdmins(transaction.transactionId);

    await ctx.reply('Report submitted. Our team will review it shortly.');
    return ctx.scene.leave();
  }
);

module.exports = reportScene;