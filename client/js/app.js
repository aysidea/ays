// ============================================================
// تنظیمات اولیه
// ============================================================
const API_BASE_URL = 'https://ays-server.onrender.com/api';
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
    about: document.getElementById('aboutPage'),
    account: document.getElementById('accountPage'),
};
const navItems = document.querySelectorAll('.nav-item');
const header = document.getElementById('mainHeader');
const bottomNav = document.getElementById('bottomNav');
const startBtn = document.getElementById('startBtn');
const registerForm = document.getElementById('registerForm');
const submitIdeaBtn = document.getElementById('submitIdeaBtn');
const ideaInput = document.getElementById('ideaInput');
const ideaFeedback = document.getElementById('ideaFeedback');
const ideasList = document.getElementById('ideasList');
const accountInfo = document.getElementById('accountInfo');
const logoutBtn = document.getElementById('logoutBtn');

// ============================================================
// توابع کمکی
// ============================================================
function showPage(pageId) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) item.classList.add('active');
    });

    // نمایش/مخفی کردن هدر و منو
    const internalPages = ['dashboardPage', 'myIdeasPage', 'aboutPage', 'accountPage'];
    if (internalPages.includes(pageId)) {
        header.classList.add('visible');
        bottomNav.classList.add('visible');
    } else {
        header.classList.remove('visible');
        bottomNav.classList.remove('visible');
    }

    if (pageId === 'myIdeasPage' && currentUserId) loadMyIdeas();
    if (pageId === 'accountPage' && currentUserId) loadAccountInfo();
}

function showFeedback(message, type = 'success') {
    ideaFeedback.textContent = message;
    ideaFeedback.className = 'feedback-message show ' + type;
    setTimeout(() => {
        ideaFeedback.className = 'feedback-message';
    }, 4000);
}

function setError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.input-error').forEach(el => el.textContent = '');
    document.getElementById('registerError').textContent = '';
}

// ============================================================
// مدیریت احراز هویت
// ============================================================
async function registerUser(phone, name, email, password) {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'خطا در ثبت‌نام');
    return data;
}

async function loginUser(phone, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'خطا در ورود');
    return data;
}

async function checkUserSession() {
    if (!currentUserId) {
        showPage('landingPage');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/user/${currentUserId}`);
        if (!response.ok) throw new Error('کاربر یافت نشد');
        currentUserData = await response.json();
        showPage('dashboardPage');
    } catch (error) {
        localStorage.removeItem('ays_user_id');
        currentUserId = null;
        showPage('landingPage');
    }
}

// ============================================================
// مدیریت ایده‌ها
// ============================================================
async function submitIdea(content) {
    if (!currentUserId) {
        showFeedback('لطفاً ابتدا ثبت‌نام کنید.', 'error');
        return false;
    }
    if (!content || content.trim().length < 5) {
        showFeedback('لطفاً متن ایده را با جزئیات بیشتر وارد کنید.', 'error');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, content: content.trim() })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'خطا در ارسال ایده');
        showFeedback('ایده شما ثبت شد', 'success');
        ideaInput.value = '';
        loadMyIdeas();
        return true;
    } catch (error) {
        showFeedback(error.message, 'error');
        return false;
    }
}

async function loadMyIdeas() {
    if (!currentUserId) return;
    try {
        const response = await fetch(`${API_BASE_URL}/ideas?userId=${currentUserId}`);
        if (!response.ok) throw new Error('خطا در دریافت ایده‌ها');
        const ideas = await response.json();

        if (ideas.length === 0) {
            ideasList.innerHTML = `<div class="idea-item-glass" style="text-align:center;color:var(--text-muted);border-right-color:transparent;">
                <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--primary);"></i>
                هنوز ایده‌ای ثبت نکرده‌اید.
            </div>`;
            return;
        }

        ideasList.innerHTML = ideas.map(idea => `
            <div class="idea-item-glass">
                <div class="idea-content">${idea.content}</div>
                <div class="idea-meta">
                    <span>${idea.status === 'pending' ? '⏳ در انتظار بررسی' : idea.status === 'approved' ? '✅ تأیید شده' : '❌ رد شده'}</span>
                    <span>${new Date(idea.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        ideasList.innerHTML = `<div class="idea-item-glass" style="text-align:center;color:#ff4757;border-right-color:#ff4757;">
            خطا در دریافت ایده‌ها. دوباره تلاش کنید.
        </div>`;
    }
}

// ============================================================
// نمایش اطلاعات اکانت
// ============================================================
async function loadAccountInfo() {
    if (!currentUserId) return;
    try {
        const response = await fetch(`${API_BASE_URL}/user/${currentUserId}`);
        if (!response.ok) throw new Error('کاربر یافت نشد');
        const user = await response.json();
        currentUserData = user;
        accountInfo.innerHTML = `
            <div class="info-item"><span class="label">نام</span><span class="value">${user.name}</span></div>
            <div class="info-item"><span class="label">شماره تلفن</span><span class="value">${user.phone}</span></div>
            <div class="info-item"><span class="label">ایمیل</span><span class="value">${user.email || 'ثبت نشده'}</span></div>
            <div class="info-item"><span class="label">تاریخ ثبت‌نام</span><span class="value">${new Date(user.created_at).toLocaleDateString('fa-IR')}</span></div>
        `;
    } catch (error) {
        accountInfo.innerHTML = `<div class="info-item" style="color:#ff4757;">خطا در دریافت اطلاعات.</div>`;
    }
}

// ============================================================
// اعتبارسنجی فرم ثبت‌نام
// ============================================================
function validateRegisterForm() {
    clearErrors();
    let isValid = true;

    const name = document.getElementById('fullname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!name || name.length < 3) {
        setError('nameError', 'نام باید حداقل ۳ کاراکتر باشد.');
        isValid = false;
    }
    if (!phone || phone.length < 10) {
        setError('phoneError', 'شماره تلفن را به درستی وارد کنید.');
        isValid = false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('emailError', 'ایمیل معتبر نیست.');
        isValid = false;
    }
    if (!password || password.length < 6) {
        setError('passError', 'رمز عبور حداقل ۶ کاراکتر باشد.');
        isValid = false;
    }
    if (password !== confirm) {
        setError('confirmError', 'رمز عبور و تکرار آن مطابقت ندارند.');
        isValid = false;
    }

    return isValid;
}

// ============================================================
// رویدادها
// ============================================================

// شروع فرآیند ثبت‌نام
startBtn.addEventListener('click', () => {
    showPage('registerPage');
});

// ثبت‌نام
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateRegisterForm()) return;

    const name = document.getElementById('fullname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const user = await registerUser(phone, name, email, password);
        currentUserId = user.id;
        currentUserData = user;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        registerForm.reset();
        clearErrors();
    } catch (error) {
        document.getElementById('registerError').textContent = error.message;
    }
});

// ارسال ایده
submitIdeaBtn.addEventListener('click', async () => {
    await submitIdea(ideaInput.value);
});

// ناوبری پایین
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

// خروج
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ays_user_id');
    currentUserId = null;
    currentUserData = null;
    showPage('landingPage');
});

// ============================================================
// مقداردهی اولیه
// ============================================================
checkUserSession();
