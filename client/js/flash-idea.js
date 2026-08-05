const API_BASE_URL = 'https://ays-server.onrender.com/api';

async function sendFlashIdea(content) {
    const token = localStorage.getItem('ays_token');
    if (!token) {
        alert('لطفاً وارد شوید.');
        return;
    }
    const response = await fetch(`${API_BASE_URL}/flash-idea`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    });
    const data = await response.json();
    if (response.ok) {
        alert('✅ ایده لحظه‌ای ارسال شد!');
        loadFlashIdeas();
    } else {
        alert('❌ خطا: ' + data.error);
    }
}

async function loadFlashIdeas() {
    const response = await fetch(`${API_BASE_URL}/flash-ideas`);
    const ideas = await response.json();
    const container = document.getElementById('flashIdeasList');
    container.innerHTML = ideas.map(idea => `
        <div class="flash-card">
            <p>${idea.content}</p>
            <small>${idea.user_name} • ${new Date(idea.created_at).toLocaleTimeString('fa-IR')}</small>
            <div>
                <button onclick="reactToIdea(${idea.id}, 'like')">👍 ${idea.likes || 0}</button>
                <button onclick="reactToIdea(${idea.id}, 'dislike')">👎 ${idea.dislikes || 0}</button>
            </div>
        </div>
    `).join('');
}

document.getElementById('sendFlashIdea')?.addEventListener('click', () => {
    const content = document.getElementById('flashIdeaInput').value;
    if (content.trim().length > 5) {
        sendFlashIdea(content);
        document.getElementById('flashIdeaInput').value = '';
    } else {
        alert('ایده باید حداقل ۵ کاراکتر باشد.');
    }
});

loadFlashIdeas();
