const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE');
const TRUECALLER_TOKEN = process.env.TRUECALLER_TOKEN || 'PASTE_YOUR_CAPTURED_BEARER_TOKEN_HERE';

// ==================== TRUECALLER FETCH FUNCTION ====================
async function fetchTruecaller(number) {
    const url = `https://search5-noneu.truecaller.com/v2/search?q=${encodeURIComponent(number)}&countryCode=IN&type=4&encoding=json`;
    
    const headers = {
        "User-Agent": "Truecaller/15.32.6 (Android;14)",
        "Accept": "application/json",
        "Authorization": `Bearer ${TRUECALLER_TOKEN}`
    };

    try {
        const res = await axios.get(url, { headers, timeout: 15000 });
        const data = res.data;
        const info = data?.data?.[0] || {};

        const phones = info.phones || [];
        const addresses = info.addresses || [];
        const emails = info.internetAddresses || [];

        const countryCode = (addresses[0]?.countryCode || 'IN').toLowerCase();
        const flag = countryCode.length === 2 
            ? String.fromCodePoint(...[...countryCode].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) 
            : '🇮🇳';

        return {
            success: true,
            flag: flag,
            name: info.name || "Not Found in Truecaller",
            phone: phones[0]?.e164Format || number,
            carrier: phones[0]?.carrier || "Unknown",
            email: emails[0]?.id || "N/A",
            gender: info.gender || "N/A",
            city: addresses[0]?.city || "N/A",
            country: addresses[0]?.countryCode || "IN",
            image: info.image || null,
            isFraud: info.isFraud || false,
            spamScore: info.spamScore || 0
        };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.status === 401 ? "❌ Token Expired! Update Truecaller Token" : `Error: ${error.message}`
        };
    }
}

// ==================== START COMMAND ====================
bot.start((ctx) => {
    ctx.replyWithHTML(
        `🔥 <b>Premium Truecaller Bot 2026</b>\n\n` +
        `Send kar number with country code\n` +
        `Example: <code>+919876543210</code>`,
        Markup.inlineKeyboard([
            [Markup.button.url('⭐ GitHub Repo', 'https://github.com/yourusername/truecaller-tg-bot')],
            [Markup.button.url('🔄 Update Token', 'https://t.me/yourusername')] // apna link daal
        ])
    );
});

// ==================== MAIN COMMAND ====================
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    
    // Simple number check (starts with + or digit)
    if (!/^\+?\d{10,15}$/.test(text.replace(/\s+/g, ''))) {
        return ctx.reply("❌ Invalid number! Example: +919876543210");
    }

    const loadingMsg = await ctx.reply("🔍 Searching Truecaller Database...\nPlease wait...");

    const result = await fetchTruecaller(text);

    if (!result.success) {
        return ctx.telegram.editMessageText(
            loadingMsg.chat.id, loadingMsg.message_id, null,
            result.error, { parse_mode: 'HTML' }
        );
    }

    const fraudColor = result.isFraud ? '🔴' : '🟢';

    let caption = 
        `${result.flag} <b>Truecaller Premium Result 2026</b>\n\n` +
        `👤 <b>Name:</b> <code>${result.name}</code>\n` +
        `📱 <b>Phone:</b> <code>${result.phone}</code>\n` +
        `📡 <b>Carrier:</b> <code>${result.carrier}</code>\n` +
        `📧 <b>Email:</b> <code>${result.email}</code>\n` +
        `🚻 <b>Gender:</b> <code>${result.gender}</code>\n` +
        `🏙️ <b>City:</b> <code>${result.city}</code>\n` +
        `🌍 <b>Country:</b> ${result.flag} ${result.country}\n` +
        `⚠️ <b>Fraud/Spam:</b> ${fraudColor} ${result.isFraud ? 'YES' : 'NO'}\n\n` +
        `Requested by @${ctx.from.username || ctx.from.first_name}`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh Search', `refresh_${text}`)],
        [Markup.button.url('📲 Open Truecaller App', 'https://www.truecaller.com/')]
    ]);

    await ctx.telegram.editMessageText(
        loadingMsg.chat.id, loadingMsg.message_id, null,
        caption,
        { 
            parse_mode: 'HTML',
            ...keyboard 
        }
    );
});

// Refresh button handler
bot.action(/refresh_(.+)/, async (ctx) => {
    const number = ctx.match[1];
    await ctx.answerCbQuery('🔄 Refreshing...');
    
    const loadingMsg = await ctx.reply("🔍 Refreshing Truecaller data...");
    const result = await fetchTruecaller(number);
    
    // Same embed logic as above (repeat kar diya simple rakhne ke liye)
    if (!result.success) {
        return ctx.telegram.editMessageText(loadingMsg.chat.id, loadingMsg.message_id, null, result.error);
    }

    // ... (same caption aur keyboard bana sakte ho, ya copy-paste from above)
    // For brevity main yahan short rakh raha, full chahiye to bata
    await ctx.telegram.editMessageText(loadingMsg.chat.id, loadingMsg.message_id, null, "✅ Refreshed! (Add full embed if needed)");
});

// ==================== KEEP ALIVE FOR RENDER ====================
const app = express();
app.get('/', (req, res) => res.send('Truecaller Telegram Bot is Alive 🔥'));
app.listen(process.env.PORT || 3000, () => {
    console.log(`Keep-alive server running on port ${process.env.PORT || 3000}`);
});

console.log('🚀 Premium Truecaller Telegram Bot Started!');

// Launch the bot
bot.launch();

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
