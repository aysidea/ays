const API_BASE_URL = 'https://ays-server.onrender.com/api';
let currentToken = localStorage.getItem('ays_token');
let currentUserId = localStorage.getItem('ays_user_id');
let currentUserData = null;

const pages = {
    landing: document.getElementById('landingPage'),
    register: document.getElementById('registerPage'),
    dashboard: document.getElementById('dashboardPage'),
    myIdeas: document.getElementById('myIdeasPage'),
    account: document.getElementById('accountPage'),
    about: document.getElementById('aboutPage'),
};

const navItems = document.querySelectorAll('.nav-item');
const startBtn = document.getElementById('startBtn');
const startBtnText = document.getElementById('startBtnText');
const startBtnLoader = document.getElementById('startBtnLoader');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const submitIdeaBtn = document.getElementById('submitIdeaBtn');
const ideaInput = document.getElementById('ideaInput');
const ideaFeedback = document.getElementById('ideaFeedback');
const ideasList = document.getElementById('ideasList');
const accountInfo = document.getElementById('accountInfo');
const logoutBtn = document.getElementById('logoutBtn');
const header = document.getElementById('mainHeader');
const bottomNav = document.getElementById('bottomNav');
const registerBtn = document.getElementById('registerBtn');
const registerBtnText = document.getElementById('registerBtnText');
const registerBtnLoader = document.getElementById('registerBtnLoader');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginBtnLoader = document.getElementById('loginBtnLoader');
const consultBtn = document.getElementById('consultBtn');
const consultModal = document.getElementById('consultModal');
const consultClose = document.querySelector('.consult-close');
const consultSubmitBtn = document.getElementById('consultSubmitBtn');
const consultSubmitText = document.getElementById('consultSubmitText');
const consultSubmitLoader = document.getElementById('consultSubmitLoader');

function showLoader(btnId, loaderId, textId, show) {
    const btn = document.getElementById(btnId);
    const loader = document.getElementById(loaderId);
    const text = document.getElementById(textId);
    if (!btn || !loader || !text) return;
    if (show) {
        text.style.display = 'none';
        loader.style.display = 'inline-flex';
        btn.disabled = true;
    } else {
        text.style.display = 'inline';
        loader.style.display = 'none';
        btn.disabled = false;
    }
}

function showPage(pageId) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    const noScrollPages = ['landingPage', 'registerPage'];
    if (noScrollPages.includes(pageId)) {
        header.classList.add('hidden-header');
        bottomNav.classList.add('hidden-nav');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.inset = '0';
    } else {
        header.classList.remove('hidden-header');
        bottomNav.classList.remove('hidden-nav');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.inset = '';
    }

    if (pageId === 'dashboardPage' && currentToken) {
        consultBtn.style.display = 'block';
    } else {
        consultBtn.style.display = 'none';
    }

    if (pageId === 'myIdeasPage' && currentToken) loadMyIdeas();
    if (pageId === 'accountPage' && currentToken) loadAccountInfo();
}

function showFeedback(message, isSuccess = true) {
    ideaFeedback.textContent = message;
    ideaFeedback.style.color = isSuccess ? '#27AE60' : '#C0392B';
    ideaFeedback.classList.add('show');
    setTimeout(() => ideaFeedback.classList.remove('show'), 3000);
}

function getAuthHeaders() {
    const token = localStorage.getItem('ays_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function registerUser(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'خطا در ثبت‌نام');
    }
    return data;
}

async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'خطا در ورود');
    }
    return data;
}

async function getUserData() {
    const response = await fetch(`${API_BASE_URL}/user`, {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'خطا در دریافت اطلاعات');
    }
    return data;
}

async function checkSession() {
    if (!currentToken || !currentUserId) {
        showPage('landingPage');
        return;
    }
    try {
        const user = await getUserData();
        currentUserData = user;
        showPage('dashboardPage');
    } catch (error) {
        console.warn('نشست منقضی یا نامعتبر:', error.message);
        localStorage.removeItem('ays_token');
        localStorage.removeItem('ays_user_id');
        currentToken = null;
        currentUserId = null;
        showPage('landingPage');
    }
}

async function showScoreCard(ideaId) {
    const token = localStorage.getItem('ays_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/ideas/score/${ideaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const idea = await response.json();
        if (response.ok) {
            const card = document.getElementById('scoreCard');
            card.style.display = 'block';
            document.querySelector('.score-number').textContent = idea.score || 0;
            document.getElementById('scoreInnovation').textContent = idea.innovation || 0;
            document.getElementById('scoreMarket').textContent = idea.market || 0;
            document.getElementById('scoreStage').textContent = idea.stage || 0;
        }
    } catch (error) {
        console.error('خطا در دریافت امتیاز:', error);
    }
}

async function submitIdea(content, category, innovation, market, stage) {
    if (!currentToken) {
        showFeedback('لطفاً ابتدا وارد شوید.', false);
        return null;
    }
    if (!content || content.trim().length < 5) {
        showFeedback('لطفاً متن ایده را با جزئیات بیشتر وارد کنید.', false);
        return null;
    }
    if (!category) {
        showFeedback('لطفاً حوزه ایده را انتخاب کنید.', false);
        return null;
    }

    console.log('📤 ارسال ایده به سرور:', {
        content: content.trim(),
        category,
        innovation,
        market,
        stage
    });

    try {
        const response = await fetch(`${API_BASE_URL}/ideas`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                content: content.trim(),
                category,
                keywords: '',
                innovation,
                market,
                stage
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطا در ارسال ایده');
        }

        console.log(' ایده با موفقیت ثبت شد:', data);

        showFeedback('ایده شما ثبت شد', true);
        ideaInput.value = '';
        document.getElementById('ideaCategory').value = '';
        document.querySelectorAll('input[type="radio"]:checked').forEach(el => el.checked = false);
        document.querySelectorAll('input[type="radio"][value="3"]').forEach(el => el.checked = true);
        
        setTimeout(() => showScoreCard(data.id), 500);
        return data;
    } catch (error) {
        console.error('❌ خطا در ثبت ایده:', error);
        showFeedback(error.message || 'خطا در ارسال ایده.', false);
        return null;
    }
}

async function loadMyIdeas() {
    if (!currentToken) return;
    try {
        const response = await fetch(`${API_BASE_URL}/ideas`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('خطا در دریافت ایده‌ها');
        const ideas = await response.json();

        const container = document.getElementById('ideasList');
        
        if (ideas.length === 0) {
            container.innerHTML = '<p style="color:#B0A8A0;text-align:center;padding:30px;">هنوز ایده‌ای ثبت نکرده‌اید.</p>';
            return;
        }

        const showCount = 3;
        const hasMore = ideas.length > showCount;

        let cardsHtml = ideas.map((idea, index) => {
            const summary = idea.content.length > 25 
                ? idea.content.substring(0, 25) + '...' 
                : idea.content;

            const isHidden = index >= showCount;
            const hideClass = isHidden ? 'idea-card-hidden' : '';

            return `
                <div class="idea-card-modern ${hideClass}" data-idea-id="${idea.id}">
                    <div class="idea-card-header">
                        <span class="idea-card-score">⭐ ${idea.score || 0}</span>
                        <span class="idea-card-date">${new Date(idea.created_at).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div class="idea-card-summary">${summary}</div>
                    <div class="idea-card-status">
                        <span class="idea-status-badge ${idea.status}">${idea.status === 'pending' ? 'در انتظار بررسی' : idea.status === 'approved' ? 'تأیید شده' : 'رد شده'}</span>
                        <button class="idea-card-share" onclick="event.stopPropagation(); copyLink('https://ays365.onrender.com/idea/${idea.id}')">
                            <i class="fas fa-link"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        let toggleButton = '';
        if (hasMore) {
            toggleButton = `
                <div class="idea-toggle-container">
                    <button id="ideaToggleBtn" class="idea-toggle-btn">
                        <span id="toggleText">بیشتر ▼</span>
                    </button>
                </div>
            `;
        }

        container.innerHTML = cardsHtml + toggleButton;

        const toggleBtn = document.getElementById('ideaToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const hiddenCards = container.querySelectorAll('.idea-card-hidden');
                const toggleText = document.getElementById('toggleText');
                const allCards = container.querySelectorAll('.idea-card-modern');
                
                if (hiddenCards.length > 0) {
                    hiddenCards.forEach(card => card.classList.remove('idea-card-hidden'));
                    toggleText.textContent = `کمتر ▲`;
                    setTimeout(() => {
                        container.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100);
                } else {
                    allCards.forEach((card, index) => {
                        if (index >= showCount) {
                            card.classList.add('idea-card-hidden');
                        }
                    });
                    toggleText.textContent = `بیشتر ▼`;
                }
            });
        }

    } catch (error) {
        document.getElementById('ideasList').innerHTML = `<p style="color:#C0392B;text-align:center;">${error.message || 'خطا در دریافت ایده‌ها.'}</p>`;
    }
}

function copyLink(link) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showCustomToast(' لینک کپی شد!');
        }).catch(() => {
            fallbackCopy(link);
        });
    } else {
        fallbackCopy(link);
    }
}

function fallbackCopy(link) {
    const input = document.createElement('input');
    input.value = link;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showCustomToast(' لینک کپی شد!');
}

function showCustomToast(message) {
    const oldToast = document.querySelector('.custom-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

async function loadAccountInfo() {
    if (!currentToken) return;
    try {
        const user = await getUserData();
        currentUserData = user;
        accountInfo.innerHTML = `
            <p><strong>نام:</strong> <span>${user.name}</span></p>
            <p><strong>ایمیل:</strong> <span class="email-value">${user.email}</span></p>
            <p><strong>تاریخ ثبت‌نام:</strong> <span>${new Date(user.created_at).toLocaleDateString('fa-IR')}</span></p>
        `;
    } catch (error) {
        accountInfo.innerHTML = `<p style="color:#C0392B;">${error.message || 'خطا در دریافت اطلاعات.'}</p>`;
    }
}

startBtn.addEventListener('click', function() {
    showLoader('startBtn', 'startBtnLoader', 'startBtnText', true);
    setTimeout(() => {
        showLoader('startBtn', 'startBtnLoader', 'startBtnText', false);
        showPage('registerPage');
    }, 1200);
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    if (!name || !email || !password || !confirm) {
        errorEl.textContent = 'همه فیلدها را پر کنید.';
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        errorEl.textContent = 'ایمیل معتبر وارد کنید.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'رمز عبور حداقل ۶ کاراکتر باشد.';
        return;
    }
    if (password !== confirm) {
        errorEl.textContent = 'رمز عبور و تکرار آن مطابقت ندارند.';
        return;
    }

    showLoader('registerBtn', 'registerBtnLoader', 'registerBtnText', true);

    try {
        const result = await registerUser(name, email, password);
        currentToken = result.token;
        currentUserId = result.id;
        currentUserData = result;
        localStorage.setItem('ays_token', currentToken);
        localStorage.setItem('ays_user_id', currentUserId);
        showLoader('registerBtn', 'registerBtnLoader', 'registerBtnText', false);
        showPage('dashboardPage');
        registerForm.reset();
    } catch (error) {
        errorEl.textContent = error.message || 'خطا در ارتباط با سرور.';
        showLoader('registerBtn', 'registerBtnLoader', 'registerBtnText', false);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    if (!email || !password) {
        errorEl.textContent = 'همه فیلدها را پر کنید.';
        return;
    }

    showLoader('loginBtn', 'loginBtnLoader', 'loginBtnText', true);

    try {
        const result = await loginUser(email, password);
        currentToken = result.token;
        currentUserId = result.id;
        currentUserData = result;
        localStorage.setItem('ays_token', currentToken);
        localStorage.setItem('ays_user_id', currentUserId);
        showLoader('loginBtn', 'loginBtnLoader', 'loginBtnText', false);
        showPage('dashboardPage');
        loginForm.reset();
    } catch (error) {
        errorEl.textContent = error.message || 'خطا در ارتباط با سرور.';
        showLoader('loginBtn', 'loginBtnLoader', 'loginBtnText', false);
    }
});

document.getElementById('showLoginForm').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

document.getElementById('showRegisterForm').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

let currentStep = 1;
const totalSteps = 3;

function showStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const target = document.querySelector(`.step-content[data-step="${step}"]`);
    const indicator = document.querySelector(`.step[data-step="${step}"]`);
    if (target) target.classList.add('active');
    if (indicator) indicator.classList.add('active');
}

document.querySelectorAll('.btn-next-step').forEach(btn => {
    btn.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    });
});

document.querySelectorAll('.btn-prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });
});

submitIdeaBtn.addEventListener('click', async () => {
    const content = ideaInput.value;
    const category = document.getElementById('ideaCategory').value;
    const innovation = parseInt(document.querySelector('input[name="innovation"]:checked')?.value || 3);
    const market = parseInt(document.querySelector('input[name="market"]:checked')?.value || 3);
    const stage = parseInt(document.querySelector('input[name="stage"]:checked')?.value || 3);

    if (!content || content.trim().length < 5) {
        showFeedback('لطفاً متن ایده را با جزئیات بیشتر وارد کنید.', false);
        return;
    }
    if (!category) {
        showFeedback('لطفاً حوزه ایده را انتخاب کنید.', false);
        return;
    }

    showLoader('submitIdeaBtn', 'submitIdeaLoader', 'submitIdeaText', true);

    try {
        const result = await submitIdea(content, category, innovation, market, stage);
        if (result) {
            const shareCard = document.getElementById('ideaShareCard');
            const shareLink = document.getElementById('shareLink');
            shareLink.value = `${window.location.origin}/idea/${result.id}`;
            shareCard.style.display = 'flex';
            currentStep = 1;
            showStep(1);
            document.getElementById('ideaCategory').value = '';
            document.querySelectorAll('input[type="radio"][value="3"]').forEach(el => el.checked = true);
        }
    } catch (error) {
        showFeedback(error.message, false);
    }

    showLoader('submitIdeaBtn', 'submitIdeaLoader', 'submitIdeaText', false);
});

document.querySelector('.share-close').addEventListener('click', () => {
    document.getElementById('ideaShareCard').style.display = 'none';
});

document.getElementById('copyShareLink').addEventListener('click', () => {
    const input = document.getElementById('shareLink');
    input.select();
    document.execCommand('copy');
    showCustomToast(' لینک کپی شد!');
});

window.shareOn = function(platform) {
    const url = document.getElementById('shareLink').value;
    const text = 'ایده‌ای که ثبت کردم را ببینید:';
    let shareUrl = '';
    switch(platform) {
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            break;
        case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            break;
    }
    if (shareUrl) window.open(shareUrl, '_blank');
};

navItems.forEach(item => {
    item.addEventListener('click', function() {
        const pageId = this.dataset.page;
        if (!currentToken && pageId !== 'landingPage' && pageId !== 'registerPage' && pageId !== 'aboutPage') {
            showPage('landingPage');
            return;
        }
        showPage(pageId);
    });
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ays_token');
    localStorage.removeItem('ays_user_id');
    currentToken = null;
    currentUserId = null;
    currentUserData = null;
    showPage('landingPage');
});

consultBtn?.addEventListener('click', () => {
    consultModal.style.display = 'flex';
});

consultClose?.addEventListener('click', () => {
    consultModal.style.display = 'none';
});

consultModal?.addEventListener('click', (e) => {
    if (e.target === consultModal) consultModal.style.display = 'none';
});

document.getElementById('consultForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('consultPhone').value.trim();
    const topic = document.getElementById('consultTopic').value;
    const description = document.getElementById('consultDesc').value.trim();
    const feedback = document.getElementById('consultFeedback');
    feedback.textContent = '';

    if (!phone || !topic || !description) {
        feedback.textContent = 'همه فیلدها را پر کنید.';
        feedback.style.color = '#C0392B';
        return;
    }

    const token = localStorage.getItem('ays_token');
    if (!token) {
        feedback.textContent = 'لطفاً وارد شوید.';
        feedback.style.color = '#C0392B';
        return;
    }

    showLoader('consultSubmitBtn', 'consultSubmitLoader', 'consultSubmitText', true);

    try {
        const response = await fetch(`${API_BASE_URL}/consultation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phone, topic, description })
        });
        const data = await response.json();
        if (response.ok) {
            feedback.textContent = ' درخواست مشاوره با موفقیت ثبت شد.';
            feedback.style.color = '#27AE60';
            document.getElementById('consultForm').reset();
            setTimeout(() => {
                consultModal.style.display = 'none';
                feedback.textContent = '';
            }, 3000);
        } else {
            feedback.textContent = data.error || 'خطا در ثبت درخواست.';
            feedback.style.color = '#C0392B';
        }
    } catch (error) {
        feedback.textContent = 'خطا در ارتباط با سرور.';
        feedback.style.color = '#C0392B';
    }

    showLoader('consultSubmitBtn', 'consultSubmitLoader', 'consultSubmitText', false);
});

document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => console.log('Service Worker ثبت شد'))
            .catch(err => console.warn('خطا در ثبت Service Worker:', err));
    }
});
