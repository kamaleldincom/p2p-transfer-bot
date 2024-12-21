const { Scenes } = require('telegraf');
const User = require('../models/user');
const { generateReferralCode } = require('../utils/helpers');
const { MASTER_REFERRAL_CODE } = require('../config/config');

const registrationScene = new Scenes.WizardScene(
  'registration',
  // Step 1: Enter referral code
  async (ctx) => {
    ctx.session.registration = {};
    ctx.reply('Please enter a valid referral code to continue:');
    return ctx.wizard.next();
  },
  // Step 2: Validate referral code
async (ctx) => {
    const referralCode = ctx.message.text;
    
    if (referralCode === MASTER_REFERRAL_CODE) {
        ctx.session.registration.referredBy = 'MASTER';
        await ctx.reply("Let's create your profile.\nWhat's your full name?");
        return ctx.wizard.next();
    }
    
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
        ctx.reply('Invalid referral code. Please try again:');
        return;
    }
    
    ctx.session.registration.referredBy = referrer.userId;
    await ctx.reply("Great! Let's create your profile.\nWhat's your full name?");
    return ctx.wizard.next();
},
  // Step 3: Save name and ask for phone
  async (ctx) => {
    ctx.session.registration.name = ctx.message.text;
    await ctx.reply('Please enter your phone number:');
    return ctx.wizard.next();
  },
  // Step 4: Save phone and show country selection
  async (ctx) => {
    ctx.session.registration.phone = ctx.message.text;
    await ctx.reply('Select your country:', {
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
  // Step 5: Handle country selection and ask for ID
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    
    ctx.session.registration.country = ctx.callbackQuery.data;
    await ctx.reply('Optional: Would you like to add an ID/Passport number?\nThis can help increase your trust score.', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Yes', callback_data: 'add_id' },
            { text: 'Skip', callback_data: 'skip_id' }
          ]
        ]
      }
    });
    return ctx.wizard.next();
  },
  // Step 6: Handle ID choice and create user
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    
    if (ctx.callbackQuery.data === 'add_id') {
      await ctx.reply('Please enter your ID/Passport number:');
      return ctx.wizard.next();
    } else {
      return await finalizeRegistration(ctx);
    }
  },
  // Step 7: Save ID and finalize
  async (ctx) => {
    ctx.session.registration.identificationNumber = ctx.message.text;
    return await finalizeRegistration(ctx);
  }
);

async function finalizeRegistration(ctx) {
    const reg = ctx.session.registration;
    const referralCode = generateReferralCode();
  
    try {

        const existingUser = await User.findOne({ userId: ctx.from.id.toString() });
    if (existingUser) {
      await ctx.reply('You are already registered. Use /profile to see your details or /transfer to start trading.');
      return ctx.scene.leave();
    }

      const userData = {
        userId: ctx.from.id.toString(),
        telegramUsername: ctx.from.username,
        name: reg.name,
        phone: reg.phone,
        country: reg.country,
        identificationNumber: reg.identificationNumber,
        referralCode,
        referredBy: reg.referredBy
      };
      
      console.log('Attempting to create user with data:', userData);
      const user = await User.create(userData);

      // Modify the referral display for MASTER users
    const referralDisplay = user.referredBy === 'MASTER' 
    ? 'MASTER'
    : `@${(await User.findOne({ userId: user.referredBy })).telegramUsername}`;

    await ctx.reply(`Profile created! Here's your information:

👤 Profile:
• Name: ${user.name}
• Phone: ${user.phone}
• Country: ${user.country}
${user.identificationNumber ? `• ID: ${user.identificationNumber}` : ''}

🔗 Your Referral: ${user.referralCode}
👥 Referred by: ${referralDisplay}
⭐️ Initial Trust Score: ${user.trustScore}

Ready to start trading! Use /transfer to begin.`);

    return ctx.scene.leave();
  } catch (error) {
    console.error('Detailed registration error:', error);
    await ctx.reply('An error occurred during registration. Please try again with /start');
    return ctx.scene.leave();
  }
}

module.exports = registrationScene;