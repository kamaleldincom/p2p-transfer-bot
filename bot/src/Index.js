// Required dependencies
require('dotenv').config();
const { Telegraf, session, Scenes: { Stage } } = require('telegraf');
const mongoose = require('mongoose');

// Import our models and scenes
const Transaction = require('./models/transaction');
const User = require('./models/user');
const registrationScene = require('./scenes/registration');
const transferScene = require('./scenes/transfer');
const completeScene = require('./scenes/complete');
const reportScene = require('./scenes/report');
const { getValidPartners } = require('./utils/helpers');

// Initialize our Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('Connected to MongoDB');
  // await mongoose.connection.dropDatabase();
  // console.log('Database cleared');
})
  .catch(err => console.error('MongoDB connection error:', err));

// Set up session handling - this allows us to store user data during conversations
bot.use(session());

// Set up scenes - this enables our multi-step conversations
const stage = new Stage([registrationScene, transferScene, completeScene, reportScene]);
bot.use(stage.middleware());

// Basic error handling for all commands
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Please try again later.');
});

// Command handlers
// Start command initiates registration
bot.command('start', (ctx) => ctx.scene.enter('registration'));

// Transfer command starts new transfer
bot.command('transfer', (ctx) => ctx.scene.enter('transfer'));

// Requests command shows available transfer requests in user's network
bot.command('requests', async (ctx) => {
  try {
    // Find all open requests except user's own
    const openRequests = await Transaction.find({
      status: 'open',
      'initiator.userId': { $ne: ctx.from.id.toString() }
    });

    if (openRequests.length === 0) {
      return ctx.reply('No open requests available.');
    }

    // Get user's valid trading partners
    const validPartners = await getValidPartners(ctx.from.id.toString());
    const validPartnerIds = validPartners.map(p => p.userId);

    // Filter requests to only show those from valid partners
    const validRequests = openRequests.filter(req => 
      validPartnerIds.includes(req.initiator.userId)
    );

    if (validRequests.length === 0) {
      return ctx.reply('No requests found in your network.');
    }

    // Create inline keyboard buttons for each request
    const keyboard = validRequests.map(req => [{
      text: `${req.initiator.amount} ${req.initiator.currency} @ ${req.rate}`,
      callback_data: `accept_${req.transactionId}`
    }]);

    // Format each request for display
    const requestText = validRequests.map((req, index) => 
      `Request #${index + 1}:\n` +
      `Amount: ${req.initiator.amount} ${req.initiator.currency}\n` +
      `Rate: ${req.rate}` +
      (req.notes ? `\nNote: ${req.notes}` : '')
    ).join('\n\n');

    await ctx.reply(
      'Available requests in your network:\nClick a request to accept it:',
      {
        reply_markup: {
          inline_keyboard: [
            ...keyboard,
            [{ text: 'Create New Request', callback_data: 'new_request' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Error fetching requests:', error);
    await ctx.reply('Error fetching requests. Please try again later.');
  }
});

// Add handler for callback queries
bot.action(/accept_(.+)/, async (ctx) => {
  const transactionId = ctx.match[1];
  try {
    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      return ctx.reply('Request no longer available.');
    }

    if (transaction.status !== 'open') {
      return ctx.reply('This request is no longer open.');
    }

    // Update transaction status
    transaction.status = 'matched';
    transaction.recipient = {
      userId: ctx.from.id.toString()
    };
    transaction.timestamps.matched = new Date();
    await transaction.save();

    // Get partner details
    const partner = await User.findOne({ userId: transaction.initiator.userId });

    await ctx.reply(`Match confirmed! ✅
Partner: @${partner.telegramUsername}
Amount: ${transaction.initiator.amount} ${transaction.initiator.currency}
Rate: ${transaction.rate}

You can now contact them directly.
Use /complete when ready to upload proof.`);

  } catch (error) {
    console.error('Error accepting request:', error);
    await ctx.reply('Error accepting request. Please try again.');
  }
});

bot.action('new_request', (ctx) => {
  return ctx.scene.enter('transfer');
});

// Add notification handlers
bot.on('new_transfer', async (ctx) => {
  // Find matching users and notify them
  const validPartners = await getValidPartners(ctx.from.id.toString());
  for (const partner of validPartners) {
    await ctx.telegram.sendMessage(
      partner.userId,
      `New matching transfer available!\nUse /requests to view.`
    );
  }
});

// Profile command shows user information
bot.command('profile', async (ctx) => {
  try {
    const user = await User.findOne({ userId: ctx.from.id.toString() });
    if (!user) {
      return ctx.reply('Profile not found. Use /start to register.');
    }

    const referrals = await User.find({ referredBy: ctx.from.id.toString() });
    const networkInfo = `👤 Your Profile:
- Name: ${user.name}
- Country: ${user.country}
- Trust Score: ${user.trustScore} (${user.completedTransactions} transfers)

🔗 Your Network:
- Your referral code: ${user.referralCode}
- Direct referrals: ${referrals.length} users`;

    await ctx.reply(networkInfo);
  } catch (error) {
    console.error('Error fetching profile:', error);
    await ctx.reply('Error fetching profile. Please try again later.');
  }
});

// Complete command allows user to upload proof of payment
bot.command('complete', (ctx) => ctx.scene.enter('complete'));

// Report command allows user to report issues
bot.command('report', (ctx) => ctx.scene.enter('report'));

// Help command shows available commands
bot.command('help', (ctx) => {
  const helpText = `Available commands:
/start - Register new account
/transfer - Start new transfer
/requests - View available requests
/profile - View profile and history
/complete - Complete active transfer
/report - Report issues
/faq - Frequently asked questions

Need more help? Contact support.`;
  
  ctx.reply(helpText);
});

// FAQ command shows frequently asked questions
bot.command('faq', (ctx) => {
  const faqText = `Frequently Asked Questions:

How does matching work?
- You can only trade with your referrer, referrals, or siblings

What's a trust score?
- Start at 20 points
- +5 for each successful transfer

How to complete a transfer?
1. Both parties upload proof
2. Both confirm receipt
3. Trust scores update automatically

Having issues?
Use /report to contact support.`;

  ctx.reply(faqText);
});

// Unrecognized command handler
bot.on('message', (ctx) => {
  const commands = ['/start', '/transfer', '/requests', '/complete', '/report', '/profile', '/help', '/faq'];
  if (!commands.includes(ctx.message.text)) {
    ctx.reply(`Unrecognized command. Available commands:

/start - Register account
/transfer - Start transfer
/requests - View requests
/complete - Complete transfer
/report - Report issues
/profile - View profile
/help - Show this help
/faq - Common questions`);
  }
});

// Launch bot
bot.launch()
  .then(() => console.log('Bot started'))
  .catch(err => console.error('Bot launch error:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));