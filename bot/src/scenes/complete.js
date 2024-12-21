const { Scenes } = require('telegraf');
const User = require('../models/user');
const Transaction = require('../models/transaction');

const completeScene = new Scenes.WizardScene(
  'complete',
  // Initial check
  async (ctx) => {
    const transaction = await Transaction.findOne({
      $or: [
        { 'initiator.userId': ctx.from.id.toString() },
        { 'recipient.userId': ctx.from.id.toString() }
      ],
      status: { $in: ['matched', 'proof_uploaded'] }
    }).populate('proofs');

    if (!transaction) {
      await ctx.reply('No active transaction found.');
      return ctx.scene.leave();
    }

    ctx.session.transaction = transaction;
    const partner = await User.findOne({ 
      userId: transaction.initiator.userId === ctx.from.id.toString() 
        ? transaction.recipient.userId 
        : transaction.initiator.userId 
    });
    ctx.session.partner = partner;

    // Check if user already uploaded proof
    const userProof = transaction.proofs.find(p => p.userId === ctx.from.id.toString());
    if (userProof) {
      await ctx.reply('You have already uploaded proof. Waiting for partner confirmation.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Report Issue', callback_data: 'report' }]
          ]
        }
      });
      return ctx.scene.leave();
    }

    await ctx.reply('Upload proof of payment (image):');
    return ctx.wizard.next();
  },
  // Handle proof upload
  async (ctx) => {
    if (!ctx.message?.photo) {
      await ctx.reply('Please send an image as proof of payment:');
      return;
    }

    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const transaction = ctx.session.transaction;

    transaction.proofs.push({
      userId: ctx.from.id.toString(),
      imageId: fileId,
      uploadedAt: new Date()
    });

    transaction.status = 'proof_uploaded';
    await transaction.save();

    // Notify partner
    await ctx.telegram.sendMessage(
      ctx.session.partner.userId,
      `@${ctx.from.username} uploaded proof of payment.\nPlease check and confirm.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirm', callback_data: 'confirm_tx' }],
            [{ text: '❌ Report Issue', callback_data: 'report' }]
          ]
        }
      }
    );

    await ctx.reply('Proof uploaded. Waiting for partner confirmation.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Report Issue', callback_data: 'report' }]
        ]
      }
    });

    return ctx.scene.leave();
  }
);

// Add action handlers
completeScene.action('confirm_tx', async (ctx) => {
  const transaction = await Transaction.findOne({
    $or: [
      { 'initiator.userId': ctx.from.id.toString() },
      { 'recipient.userId': ctx.from.id.toString() }
    ],
    status: 'proof_uploaded'
  });

  if (!transaction) {
    return ctx.reply('No active transaction to confirm.');
  }

  // Update transaction status
  transaction.status = 'completed';
  transaction.timestamps.completed = new Date();
  await transaction.save();

  // Update trust scores
  const users = await Promise.all([
    User.findOne({ userId: transaction.initiator.userId }),
    User.findOne({ userId: transaction.recipient.userId })
  ]);

  for (const user of users) {
    user.trustScore += 5;
    user.completedTransactions += 1;
    await user.save();
  }

  // Notify both parties
  for (const user of users) {
    await ctx.telegram.sendMessage(
      user.userId,
      `Transaction completed successfully! ✅\nYour trust score increased to: ${user.trustScore}`
    );
  }
});

completeScene.action('report', async (ctx) => {
  return ctx.scene.enter('report');
});

module.exports = completeScene;