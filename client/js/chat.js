// ===== دریافت پیام‌های قدیمی =====
async function loadMessages() {
    try {
        const response = await fetch(`${API_BASE_URL}/group-messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('خطا در دریافت پیام‌ها');
        const messages = await response.json();
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';
        messages.forEach(msg => {
            const isOwn = msg.user_id == currentUserId;
            container.appendChild(createMessageElement(msg, isOwn));
        });
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('خطا در دریافت پیام‌ها:', error);
    }
}

// ===== ساخت عنصر پیام =====
function createMessageElement(msg, isOwn) {
    const div = document.createElement('div');
    div.className = `chat-message ${isOwn ? 'own' : 'other'}`;
    
    const time = new Date(msg.created_at);
    const timeStr = time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString('fa-IR');
    
    div.innerHTML = `
        <span class="msg-user">${isOwn ? 'شما' : msg.user_name}</span>
        <span class="msg-content">${msg.content}</span>
        <span class="msg-time">${dateStr} - ${timeStr}</span>
    `;
    return div;
}

// ===== ارسال پیام =====
document.getElementById('sendChatBtn').addEventListener('click', sendMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    try {
        const response = await fetch(`${API_BASE_URL}/group-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('خطا در ارسال پیام');
        input.value = '';
    } catch (error) {
        console.error('خطا در ارسال پیام:', error);
    }
}

// ===== تنظیم Pusher =====
const pusher = new Pusher(pusherKey, {
    cluster: pusherCluster,
    authEndpoint: `${API_BASE_URL}/pusher-auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } }
});

const channel = pusher.subscribe('presence-chat-channel');

// ===== دریافت پیام جدید =====
channel.bind('new-message', function(data) {
    const container = document.getElementById('chatMessages');
    const isOwn = data.user_id == currentUserId;
    const msgElement = createMessageElement(data, isOwn);
    container.appendChild(msgElement);
    container.scrollTop = container.scrollHeight;
});

// ===== آنلاین‌ها =====
channel.bind('pusher:subscription_succeeded', function(members) {
    document.getElementById('onlineCount').textContent = `🟢 ${members.count} نفر آنلاین`;
});

channel.bind('pusher:member_added', function(member) {
    const count = channel.members.count;
    document.getElementById('onlineCount').textContent = `🟢 ${count} نفر آنلاین`;
});

channel.bind('pusher:member_removed', function(member) {
    const count = channel.members.count;
    document.getElementById('onlineCount').textContent = `🟢 ${count} نفر آنلاین`;
});

// ===== بارگذاری اولیه =====
loadMessages();
