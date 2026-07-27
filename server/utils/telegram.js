const axios = require('axios');
require('dotenv').config();

async function sendToTelegram(name, phone, idea) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const text = `📣 ایده جدید\n\n👤 ${name}\n📞 ${phone}\n💡 ${idea}`;
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });
}

module.exports = { sendToTelegram };
