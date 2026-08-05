const API_BASE_URL = 'https://ays-server.onrender.com/api';

async function loadMicroIdeas() {
    const response = await fetch(`${API_BASE_URL}/micro-ideas`);
    const ideas = await response.json();
    const container = document.getElementById('microIdeasList');
    container.innerHTML = ideas.map(idea => `
        <div class="micro-card">
            <h4>${idea.title}</h4>
            <p>${idea.description}</p>
            <span class="price">💰 ${idea.price} تومان</span>
            <button onclick="buyMicroIdea(${idea.id})" class="btn-primary">خرید</button>
        </div>
    `).join('');
}

async function buyMicroIdea(id) {
    const token = localStorage.getItem('ays_token');
    if (!token) {
        alert('لطفاً وارد شوید.');
        return;
    }
    const response = await fetch(`${API_BASE_URL}/buy-micro-idea/${id}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    alert(data.message || '✅ خرید انجام شد!');
    loadMicroIdeas();
}

loadMicroIdeas();
