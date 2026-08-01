const API_BASE_URL = 'https://ays-server.onrender.com/api';
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
const registerLoader = document.getElementById('registerLoader');

// ===== توابع کمکی =====
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
    } else {
        header.classList.remove('hidden-header');
        bottomNav.classList.remove('hidden-nav');
        document.body.style.overflow = '';
    }

    if (pageId === 'myIdeasPage' && currentUserId) loadMyIdeas();
    if (pageId === 'accountPage' && currentUserId) loadAccountInfo();
}

function showFeedback(message, isSuccess = true) {
    ideaFeedback.textContent = message;
    ideaFeedback.style.color = isSuccess ? '#27AE60' : '#C0392B';
    ideaFeedback.classList.add('show');
    setTimeout(() => ideaFeedback.classList.remove('show'), 3000);
}

function showLoading(show) {
    if (show) {
        registerBtnText.style.display = 'none';
        registerLoader.style.display = 'inline-block';
        registerBtn.disabled = true;
        registerBtn.style.opacity = '0.7';
    } else {
        registerBtnText.style.display = 'inline';
        registerLoader.style.display = 'none';
        registerBtn.disabled = false;
        registerBtn.style.opacity = '1';
    }
}

// ===== احراز هویت =====
async function registerUser(name, email, password) {
    const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    return res.json();
}

async function loginUser(email, password) {
    const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
}

async function getUserData(userId) {
    const res = await fetch(`${API_BASE_URL}/user/${userId}`);
    return res.json();
}

async function checkSession() {
    if (!currentUserId) {
        showPage('landingPage');
        return;
    }
    try {
        const user = await getUserData(currentUserId);
        if (user.error) throw new Error('کاربر یافت نشد');
        currentUserData = user;
        showPage('dashboardPage');
    } catch {
        localStorage.removeItem('ays_user_id');
        currentUserId = null;
        showPage('landingPage');
    }
}

// ===== مدیریت ایده‌ها =====
async function submitIdea(content) {
    if (!currentUserId) {
        showFeedback('لطفاً ابتدا وارد شوید.', false);
        return false;
    }
    if (!content || content.trim().length < 5) {
        showFeedback('لطفاً متن ایده را با جزئیات بیشتر وارد کنید.', false);
        return false;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, content: content.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'خطا در ارسال ایده');
        showFeedback('ایده شما ثبت شد', true);
        ideaInput.value = '';
        return true;
    } catch (error) {
        showFeedback(error.message, false);
        return false;
    }
}

async function loadMyIdeas() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/ideas?userId=${currentUserId}`);
        if (!res.ok) throw new Error('خطا در دریافت ایده‌ها');
        const ideas = await res.json();
        if (ideas.length === 0) {
            ideasList.innerHTML = '<p style="color:#B0A8A0;text-align:center;padding:30px;">هنوز ایده‌ای ثبت نکرده‌اید.</p>';
            return;
        }
        ideasList.innerHTML = ideas.map(idea => `
            <div class="idea-card-modern">
                <div class="idea-content">${idea.content}</div>
                <div class="idea-meta">
                    <span class="idea-status-badge ${idea.status}">${idea.status === 'pending' ? 'در انتظار بررسی' : idea.status === 'approved' ? 'تأیید شده' : 'رد شده'}</span>
                    <span>${new Date(idea.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
            </div>
        `).join('');
    } catch {
        ideasList.innerHTML = '<p style="color:#C0392B;text-align:center;">خطا در دریافت ایده‌ها. دوباره تلاش کنید.</p>';
    }
}

async function loadAccountInfo() {
    if (!currentUserId) return;
    try {
        const user = await getUserData(currentUserId);
        if (user.error) throw new Error('کاربر یافت نشد');
        currentUserData = user;
        accountInfo.innerHTML = `
            <p><strong>نام:</strong> <span>${user.name}</span></p>
            <p><strong>ایمیل:</strong> <span>${user.email}</span></p>
            <p><strong>تاریخ ثبت‌نام:</strong> <span>${new Date(user.created_at).toLocaleDateString('fa-IR')}</span></p>
        `;
    } catch {
        accountInfo.innerHTML = '<p style="color:#C0392B;">خطا در دریافت اطلاعات.</p>';
    }
}

// ===== رویدادها =====
startBtn.addEventListener('click', () => showPage('registerPage'));

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

    showLoading(true);

    try {
        const result = await registerUser(name, email, password);
        if (result.error) {
            errorEl.textContent = result.error;
            showLoading(false);
            return;
        }
        setTimeout(() => {
            currentUserId = result.id;
            currentUserData = result;
            localStorage.setItem('ays_user_id', currentUserId);
            showLoading(false);
            showPage('dashboardPage');
            registerForm.reset();
        }, 1200);
    } catch {
        errorEl.textContent = 'خطا در ارتباط با سرور.';
        showLoading(false);
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

    try {
        const result = await loginUser(email, password);
        if (result.error) {
            errorEl.textContent = result.error;
            return;
        }
        currentUserId = result.id;
        currentUserData = result;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        loginForm.reset();
    } catch {
        errorEl.textContent = 'خطا در ارتباط با سرور.';
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

submitIdeaBtn.addEventListener('click', async () => {
    await submitIdea(ideaInput.value);
});

navItems.forEach(item => {
    item.addEventListener('click', function() {
        const pageId = this.dataset.page;
        if (!currentUserId && pageId !== 'landingPage' && pageId !== 'registerPage' && pageId !== 'aboutPage') {
            showPage('landingPage');
            return;
        }
        showPage(pageId);
    });
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ays_user_id');
    currentUserId = null;
    currentUserData = null;
    showPage('landingPage');
});

// ===== مقداردهی اولیه با سرعت بالا =====
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
});
