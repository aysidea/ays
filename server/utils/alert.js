const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

async function sendAlertToTelegram(type, message, details = {}) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('⚠️ BOT_TOKEN یا CHAT_ID تنظیم نشده، هشدار ارسال نشد.');
        return false;
    }

    const timestamp = new Date().toLocaleString('fa-IR');
    const ip = details.ip || 'نامشخص';
    const path = details.path || 'نامشخص';
    const user = details.user || 'کاربر مهمان';

    let emoji = '🔴';
    let priority = '';

    switch (type) {
        case 'SECURITY':
            emoji = '🚨';
            priority = '⚠️ هشدار امنیتی';
            break;
        case 'ERROR':
            emoji = '❌';
            priority = '🔥 خطای سرور';
            break;
        case 'WARNING':
            emoji = '⚠️';
            priority = 'هشدار';
            break;
        default:
            emoji = '📢';
            priority = 'گزارش';
    }

    const text = `
${emoji} *${priority}*

📋 ${message}
🕐 زمان: ${timestamp}
👤 کاربر: ${user}
🌐 IP: ${ip}
📂 مسیر: ${path}
${details.stack ? `📄 استک: ${details.stack}` : ''}
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
        console.log('✅ هشدار به تلگرام ارسال شد.');
        return true;
    } catch (error) {
        console.error('❌ خطا در ارسال هشدار به تلگرام:', error.message);
        return false;
    }
}

module.exports = { sendAlertToTelegram };
