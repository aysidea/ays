const API_BASE_URL = 'https://ays-server.onrender.com/api';
let currentUserId = localStorage.getItem('ays_user_id');
let currentUserData = null;
let pendingUserId = null;

const pages = document.querySelectorAll('.page');
const header = document.getElementById('mainHeader');
const bottomNav = document.getElementById('bottomNav');
const navItems = document.querySelectorAll('.nav-item');

const startBtn = document.getElementById('startBtn');
const registerForm = document.getElementById('registerForm');
const verifySection = document.getElementById('verifySection');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const verifyCodeInput = document.getElementById('verifyCode');

const submitIdeaBtn = document.getElementById('submitIdeaBtn');
const ideaInput = document.getElementById('ideaInput');
const ideaFeedback = document.getElementById('ideaFeedback');
const ideasList = document.getElementById('ideasList');
const accountInfo = document.getElementById('accountInfo');
const logoutBtn = document.getElementById('logoutBtn');

function showPage(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) item.classList.add('active');
    });

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
    ideaFeedback.className = 'feedback show ' + type;
    setTimeout(() => {
        ideaFeedback.className = 'feedback';
    }, 4000);
}

function setError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    document.getElementById('registerError').textContent = '';
    document.getElementById('verifyError').textContent = '';
    document.getElementById('verifyMessage').textContent = '';
}

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

async function sendVerificationRequest(userId) {
    const response = await fetch(`${API_BASE_URL}/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'خطا در ارسال کد');
    return data;
}

async function verifyCode(userId, code) {
    const response = await fetch(`${API_BASE_URL}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'کد تأیید اشتباه است');
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
        const user = await response.json();
        if (user.status === 'pending') {
            localStorage.removeItem('ays_user_id');
            currentUserId = null;
            showPage('landingPage');
            return;
        }
        currentUserData = user;
        showPage('dashboardPage');
    } catch (error) {
        localStorage.removeItem('ays_user_id');
        currentUserId = null;
        showPage('landingPage');
    }
}

async function submitIdea(content) {
    if (!currentUserId) {
        showFeedback('لطفاً ابتدا وارد شوید.', 'error');
        return false;
    }
    if (!content || content.trim().length < 5) {
        showFeedback('متن ایده باید حداقل ۵ کاراکتر باشد.', 'error');
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
                <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--primary-dark);"></i>
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
        ideasList.innerHTML = `<div class="idea-item-glass" style="text-align:center;color:#F87171;border-right-color:#F87171;">
            خطا در دریافت ایده‌ها. دوباره تلاش کنید.
        </div>`;
    }
}

async function loadAccountInfo() {
    if (!currentUserId) return;
    try {
        const response = await fetch(`${API_BASE_URL}/user/${currentUserId}`);
        if (!response.ok) throw new Error('کاربر یافت نشد');
        const user = await response.json();
        currentUserData = user;
        accountInfo.innerHTML = `
            <div class="info-item"><span class="label">نام</span><span class="value">${user.name}</span></div>
            <div class="info-item"><span class="label">ایمیل</span><span class="value">${user.email}</span></div>
            <div class="info-item"><span class="label">شماره تلفن</span><span class="value">${user.phone}</span></div>
            <div class="info-item"><span class="label">تاریخ ثبت‌نام</span><span class="value">${new Date(user.created_at).toLocaleDateString('fa-IR')}</span></div>
        `;
    } catch (error) {
        accountInfo.innerHTML = `<div class="info-item" style="color:#F87171;">خطا در دریافت اطلاعات.</div>`;
    }
}

function validateRegisterForm() {
    clearErrors();
    let isValid = true;

    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!name || name.length < 3) {
        setError('nameError', 'نام حداقل ۳ کاراکتر باشد.');
        isValid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('emailError', 'ایمیل معتبر نیست.');
        isValid = false;
    }
    if (!phone || phone.length < 10) {
        setError('phoneError', 'شماره تلفن معتبر نیست.');
        isValid = false;
    }
    if (!password || password.length < 6) {
        setError('passError', 'رمز عبور حداقل ۶ کاراکتر باشد.');
        isValid = false;
    }
    if (password !== confirm) {
        setError('confirmError', 'رمزها مطابقت ندارند.');
        isValid = false;
    }

    return isValid;
}

startBtn.addEventListener('click', () => {
    showPage('registerPage');
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateRegisterForm()) return;

    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    try {
        const user = await registerUser(phone, name, email, password);
        pendingUserId = user.id;
        await sendVerificationRequest(pendingUserId);
        registerForm.style.display = 'none';
        verifySection.style.display = 'block';
        document.getElementById('verifyMessage').textContent = '';
        document.getElementById('verifyError').textContent = '';
    } catch (error) {
        document.getElementById('registerError').textContent = error.message;
    }
});

verifyBtn.addEventListener('click', async () => {
    const code = verifyCodeInput.value.trim();
    if (!code || code.length !== 6) {
        document.getElementById('verifyError').textContent = 'کد باید ۶ رقم باشد.';
        return;
    }

    try {
        const result = await verifyCode(pendingUserId, code);
        currentUserId = pendingUserId;
        currentUserData = result.user;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        registerForm.reset();
        verifyCodeInput.value = '';
        verifySection.style.display = 'none';
        registerForm.style.display = 'flex';
        clearErrors();
    } catch (error) {
        document.getElementById('verifyMessage').textContent = error.message;
    }
});

resendBtn.addEventListener('click', async () => {
    try {
        await sendVerificationRequest(pendingUserId);
        document.getElementById('verifyMessage').textContent = 'کد جدید به ایمیل شما ارسال شد.';
        document.getElementById('verifyMessage').style.color = '#34D399';
    } catch (error) {
        document.getElementById('verifyMessage').textContent = error.message;
        document.getElementById('verifyMessage').style.color = '#F87171';
    }
});

submitIdeaBtn.addEventListener('click', async () => {
    await submitIdea(ideaInput.value);
});

navItems.forEach(item => {
    item.addEventListener('click', function() {
        const pageId = this.dataset.page;
        if (!currentUserId) {
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
    pendingUserId = null;
    showPage('landingPage');
});

checkUserSession();
