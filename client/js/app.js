// ============================================================
// تنظیمات اولیه
// ============================================================
const API_BASE_URL = 'https://ays-server.onrender.com/api';
let currentToken = localStorage.getItem('ays_token');
let currentUserId = localStorage.getItem('ays_user_id');
let currentUserData = null;

// ============================================================
// المان‌های DOM
// ============================================================
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
const startLoader = document.getElementById('startLoader');
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

// ============================================================
// توابع کمکی
// ============================================================
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

    if (pageId === 'myIdeasPage' && currentToken) loadMyIdeas();
    if (pageId === 'accountPage' && currentToken) loadAccountInfo();
}

function showFeedback(message, isSuccess = true) {
    ideaFeedback.textContent = message;
    ideaFeedback.style.color = isSuccess ? '#27AE60' : '#C0392B';
    ideaFeedback.classList.add('show');
    setTimeout(() => ideaFeedback.classList.remove('show'), 3000);
}

function showLoading(show, type = 'register') {
    if (type === 'register') {
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
    } else if (type === 'start') {
        if (show) {
            startBtnText.style.display = 'none';
            startLoader.style.display = 'inline-block';
            startBtn.disabled = true;
            startBtn.style.opacity = '0.7';
        } else {
            startBtnText.style.display = 'inline';
            startLoader.style.display = 'none';
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
        }
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('ays_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function handleApiError(error, defaultMessage = 'خطا در ارتباط با سرور.') {
    console.error('❌ خطای API:', error);
    if (error.message) return error.message;
    return defaultMessage;
}

// ============================================================
// توابع احراز هویت
// ============================================================
async function registerUser(name, email, password) {
    try {
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
    } catch (error) {
        throw new Error(handleApiError(error, 'خطا در ارتباط با سرور.'));
    }
}

async function loginUser(email, password) {
    try {
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
    } catch (error) {
        throw new Error(handleApiError(error, 'خطا در ارتباط با سرور.'));
    }
}

async function getUserData() {
    try {
        const response = await fetch(`${API_BASE_URL}/user`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطا در دریافت اطلاعات');
        }
        return data;
    } catch (error) {
        throw new Error(handleApiError(error, 'خطا در دریافت اطلاعات کاربر.'));
    }
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

// ============================================================
// توابع مدیریت ایده‌ها
// ============================================================
async function submitIdea(content) {
    if (!currentToken) {
        showFeedback('لطفاً ابتدا وارد شوید.', false);
        return false;
    }
    if (!content || content.trim().length < 5) {
        showFeedback('لطفاً متن ایده را با جزئیات بیشتر وارد کنید.', false);
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/ideas`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content: content.trim() })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطا در ارسال ایده');
        }
        showFeedback('ایده شما ثبت شد', true);
        ideaInput.value = '';
        return true;
    } catch (error) {
        showFeedback(handleApiError(error, 'خطا در ارسال ایده.'), false);
        return false;
    }
}

async function loadMyIdeas() {
    if (!currentToken) return;
    try {
        const response = await fetch(`${API_BASE_URL}/ideas`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('خطا در دریافت ایده‌ها');
        }
        const ideas = await response.json();
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
    } catch (error) {
        ideasList.innerHTML = `<p style="color:#C0392B;text-align:center;">${handleApiError(error, 'خطا در دریافت ایده‌ها.')}</p>`;
    }
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
        accountInfo.innerHTML = `<p style="color:#C0392B;">${handleApiError(error, 'خطا در دریافت اطلاعات.')}</p>`;
    }
}

// ============================================================
// رویدادها
// ============================================================

// دکمه شروع
startBtn.addEventListener('click', function() {
    showLoading(true, 'start');
    setTimeout(() => {
        showLoading(false, 'start');
        showPage('registerPage');
    }, 1200);
});

// ثبت‌نام
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    // اعتبارسنجی سمت کلاینت
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

    showLoading(true, 'register');

    try {
        const result = await registerUser(name, email, password);
        // ذخیره توکن و اطلاعات
        currentToken = result.token;
        currentUserId = result.id;
        currentUserData = result;
        localStorage.setItem('ays_token', currentToken);
        localStorage.setItem('ays_user_id', currentUserId);

        showLoading(false, 'register');
        showPage('dashboardPage');
        registerForm.reset();
    } catch (error) {
        errorEl.textContent = error.message;
        showLoading(false, 'register');
    }
});

// ورود
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
        currentToken = result.token;
        currentUserId = result.id;
        currentUserData = result;
        localStorage.setItem('ays_token', currentToken);
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        loginForm.reset();
    } catch (error) {
        errorEl.textContent = error.message;
    }
});

// تغییر بین فرم‌های ثبت‌نام و ورود
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

// ارسال ایده
submitIdeaBtn.addEventListener('click', async () => {
    await submitIdea(ideaInput.value);
});

// ناوبری پایین
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

// خروج
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ays_token');
    localStorage.removeItem('ays_user_id');
    currentToken = null;
    currentUserId = null;
    currentUserData = null;
    showPage('landingPage');
});

// ============================================================
// مقداردهی اولیه
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // بررسی نشست
    checkSession();

    // ثبت Service Worker برای PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => console.log('✅ Service Worker ثبت شد'))
            .catch(err => console.warn('⚠️ خطا در ثبت Service Worker:', err));
    }
});
