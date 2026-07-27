const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

async function sendToTelegram(userName, email, ideaContent) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('BOT_TOKEN یا CHAT_ID در محیط تعریف نشده است.');
        return false;
    }

    const message = `
🆕 ایده جدید ثبت شد!

👤 نام: ${userName}
📧 ایمیل: ${email}
💡 متن ایده:
${ideaContent}

📅 تاریخ: ${new Date().toLocaleString('fa-IR')}
    `;

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        return true;
    } catch (error) {
        console.error('خطا در ارسال به تلگرام:', error.message);
        return false;
    }
}

module.exports = { sendToTelegram };
