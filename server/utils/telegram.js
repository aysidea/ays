const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

async function sendToTelegram(userName, userEmail, message) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('❌ BOT_TOKEN یا CHAT_ID در محیط تعریف نشده است.');
        return false;
    }

    if (!message || message.trim().length === 0) {
        console.error('❌ پیام خالی است، ارسال نشد.');
        return false;
    }

    const fullMessage = `
🆕 ایده جدید ثبت شد!

👤 نام: ${userName || 'نامشخص'}
📧 ایمیل: ${userEmail || 'نامشخص'}
💡 متن ایده:
${message.trim()}

📅 تاریخ: ${new Date().toLocaleString('fa-IR')}
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: fullMessage,
            parse_mode: 'HTML'
        });
        console.log('✅ پیام ایده به تلگرام ارسال شد.');
        return true;
    } catch (error) {
        console.error('❌ خطا در ارسال به تلگرام:', error.message);
        return false;
    }
}

async function sendConsultationToTelegram(userName, userEmail, phone, topic, description) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('❌ BOT_TOKEN یا CHAT_ID در محیط تعریف نشده است.');
        return false;
    }

    const message = `
🆕 درخواست مشاوره جدید!

👤 نام: ${userName || 'نامشخص'}
📧 ایمیل: ${userEmail || 'نامشخص'}
📱 شماره: ${phone || 'نامشخص'}
📌 موضوع: ${topic || 'نامشخص'}
💬 توضیحات:
${description || 'توضیحی وارد نشده است'}

📅 تاریخ: ${new Date().toLocaleString('fa-IR')}
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ پیام مشاوره به تلگرام ارسال شد.');
        return true;
    } catch (error) {
        console.error('❌ خطا در ارسال مشاوره به تلگرام:', error.message);
        return false;
    }
}

module.exports = { sendToTelegram, sendConsultationToTelegram };
