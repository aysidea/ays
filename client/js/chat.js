// ===== تنظیمات اولیه =====
const container = document.getElementById('chatMessages');
const input = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendChatBtn');
const onlineCount = document.getElementById('onlineCount');

let isFirstLoad = true;

// ===== دریافت پیام‌های قدیمی =====
async function loadMessages() {
    try {
        const response = await fetch(`${API_BASE_URL}/group-messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('خطا در دریافت پیام‌ها');
        const messages = await response.json();
        container.innerHTML = '';
        messages.forEach(msg => {
            const isOwn = msg.user_id == currentUserId;
            container.appendChild(createMessageElement(msg, isOwn));
        });
        scrollToBottom();
    } catch (error) {
        console.error('❌ خطا در دریافت پیام‌ها:', error);
    }
}

// ===== ساخت عنصر پیام =====
function createMessageElement(msg, isOwn) {
    const div = document.createElement('div');
    div.className = `chat-message ${isOwn ? 'own' : 'other'}`;
    
    const date = new Date(msg.created_at);
    const timeStr = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('fa-IR');
    
    div.innerHTML = `
        <span class="msg-user">${isOwn ? 'شما' : msg.user_name}</span>
        <span class="msg-content">${msg.content}</span>
        <span class="msg-time">${dateStr} - ${timeStr}</span>
    `;
    return div;
}

// ===== اسکرول به پایین =====
function scrollToBottom() {
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

// ===== ارسال پیام =====
async function sendMessage() {
    const content = input.value.trim();
    if (!content) return;

    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.6';

    try {
        const response = await fetch(`${API_BASE_URL}/group-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        const data = await response.json();
        if (!response.ok) {
            alert('خطا: ' + (data.error || 'مشکل در ارسال'));
            return;
        }
        input.value = '';
    } catch (error) {
        console.error('❌ خطا در ارسال:', error);
        alert('خطا در ارتباط با سرور');
    } finally {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
    }
}

// ===== رویدادها =====
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// ===== دکمه برگشت =====
document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = '/';
});

// ===== تنظیم Pusher =====
const pusher = new Pusher(pusherKey, {
    cluster: pusherCluster,
    authEndpoint: `${API_BASE_URL}/pusher-auth`,
    auth: { headers: { Authorization: `Bearer ${token}` } }
});

const channel = pusher.subscribe('presence-chat-channel');

// ===== دریافت پیام جدید (لحظه‌ای) =====
channel.bind('new-message', function(data) {
    console.log('📩 پیام جدید:', data);
    const isOwn = data.user_id == currentUserId;
    const msgElement = createMessageElement(data, isOwn);
    container.appendChild(msgElement);
    scrollToBottom();
});

// ===== آنلاین‌ها (+۳ نفر ثابت) =====
channel.bind('pusher:subscription_succeeded', function(members) {
    const count = members.count + 3;
    onlineCount.textContent = `🟢 ${count} نفر آنلاین`;
});

channel.bind('pusher:member_added', function(member) {
    const count = channel.members.count + 3;
    onlineCount.textContent = `🟢 ${count} نفر آنلاین`;
});

channel.bind('pusher:member_removed', function(member) {
    const count = channel.members.count + 3;
    onlineCount.textContent = `🟢 ${count} نفر آنلاین`;
});

// ===== خطاهای Pusher =====
pusher.connection.bind('error', function(err) {
    console.error('❌ خطای Pusher:', err);
});

// ===== بارگذاری اولیه =====
loadMessages();

// ===== فعال کردن آیتم منو =====
document.addEventListener('DOMContentLoaded', function() {
    // آیتم گفتگو رو در صفحه جداگانه فعال کن
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.dataset.page === 'chatPage') {
            item.classList.add('active');
        }
    });
});
