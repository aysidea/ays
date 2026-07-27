// ============================================================
// تنظیمات اولیه
// ============================================================
const API_BASE_URL = 'https://ays-server.onrender.com/api';
let currentUserId = localStorage.getItem('ays_user_id');
let currentUserData = null;
let pendingUserId = null;

// ============================================================
// المان‌های DOM
// ============================================================
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

// ============================================================
// توابع اصلی
// ============================================================
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

// ============================================================
// مدیریت احراز هویت (شبیه‌سازی شده برای نمایش)
// ============================================================
function simulateSendVerification(email) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`کد تأیید برای ${email}: ${code}`);
            localStorage.setItem('temp_verify_code', code);
            resolve(true);
        }, 800);
    });
}

function simulateVerifyCode(inputCode) {
    const savedCode = localStorage.getItem('temp_verify_code');
    return savedCode === inputCode;
}

async function registerUser(phone, name, email, password) {
    // شبیه‌سازی ثبت‌نام
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const existing = localStorage.getItem('registered_users');
            const users = existing ? JSON.parse(existing) : [];
            if (users.find(u => u.email === email || u.phone === phone)) {
                reject(new Error('این ایمیل یا شماره قبلاً ثبت شده است.'));
                return;
            }
            const newUser = {
                id: Date.now(),
                name,
                email,
                phone,
                password,
                status: 'pending'
            };
            users.push(newUser);
            localStorage.setItem('registered_users', JSON.stringify(users));
            resolve(newUser);
        }, 500);
    });
}

async function verifyUser(userId, code) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (simulateVerifyCode(code)) {
                const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
                const user = users.find(u => u.id === userId);
                if (user) {
                    user.status = 'active';
                    localStorage.setItem('registered_users', JSON.stringify(users));
                    resolve(user);
                } else {
                    reject(new Error('کاربر یافت نشد.'));
                }
            } else {
                reject(new Error('کد تأیید اشتباه یا منقضی شده است.'));
            }
        }, 500);
    });
}

async function getUserData(userId) {
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    return users.find(u => u.id === userId);
}

function checkUserSession() {
    if (!currentUserId) {
        showPage('landingPage');
        return;
    }
    getUserData(parseInt(currentUserId)).then(user => {
        if (user && user.status === 'active') {
            currentUserData = user;
            showPage('dashboardPage');
        } else {
            localStorage.removeItem('ays_user_id');
            currentUserId = null;
            showPage('landingPage');
        }
    });
}

// ============================================================
// مدیریت ایده‌ها
// ============================================================
function submitIdea(content) {
    return new Promise((resolve, reject) => {
        if (!currentUserId) {
            reject(new Error('لطفاً ابتدا وارد شوید.'));
            return;
        }
        if (!content || content.trim().length < 5) {
            reject(new Error('متن ایده باید حداقل ۵ کلمه باشد.'));
            return;
        }

        const ideas = JSON.parse(localStorage.getItem('user_ideas') || '[]');
        const newIdea = {
            id: Date.now(),
            userId: currentUserId,
            content: content.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        ideas.push(newIdea);
        localStorage.setItem('user_ideas', JSON.stringify(ideas));
        resolve(newIdea);
    });
}

function loadMyIdeas() {
    if (!currentUserId) return;
    const ideas = JSON.parse(localStorage.getItem('user_ideas') || '[]');
    const myIdeas = ideas.filter(i => i.userId === parseInt(currentUserId)).reverse();

    if (myIdeas.length === 0) {
        ideasList.innerHTML = `<div class="idea-item-glass" style="text-align:center;color:var(--text-muted);border-right-color:transparent;">
            <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--primary-dark);"></i>
            هنوز ایده‌ای ثبت نکرده‌اید.
        </div>`;
        return;
    }

    ideasList.innerHTML = myIdeas.map(idea => `
        <div class="idea-item-glass">
            <div class="idea-content">${idea.content}</div>
            <div class="idea-meta">
                <span>${idea.status === 'pending' ? '⏳ در انتظار بررسی' : idea.status === 'approved' ? '✅ تأیید شده' : '❌ رد شده'}</span>
                <span>${new Date(idea.createdAt).toLocaleDateString('fa-IR')}</span>
            </div>
        </div>
    `).join('');
}

// ============================================================
// نمایش اطلاعات اکانت
// ============================================================
function loadAccountInfo() {
    if (!currentUserData) return;
    accountInfo.innerHTML = `
        <div class="info-item"><span class="label">نام</span><span class="value">${currentUserData.name}</span></div>
        <div class="info-item"><span class="label">ایمیل</span><span class="value">${currentUserData.email}</span></div>
        <div class="info-item"><span class="label">شماره تلفن</span><span class="value">${currentUserData.phone}</span></div>
        <div class="info-item"><span class="label">تاریخ ثبت‌نام</span><span class="value">${new Date(currentUserData.id).toLocaleDateString('fa-IR')}</span></div>
    `;
}

// ============================================================
// اعتبارسنجی فرم ثبت‌نام
// ============================================================
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

// ============================================================
// رویدادها
// ============================================================

// رفتن به صفحه ثبت‌نام
startBtn.addEventListener('click', () => {
    showPage('registerPage');
});

// ثبت‌نام مرحله اول
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
        await simulateSendVerification(email);
        registerForm.style.display = 'none';
        verifySection.style.display = 'block';
        document.getElementById('verifyMessage').textContent = '';
        document.getElementById('verifyError').textContent = '';
    } catch (error) {
        document.getElementById('registerError').textContent = error.message;
    }
});

// تأیید کد
verifyBtn.addEventListener('click', async () => {
    const code = verifyCodeInput.value.trim();
    if (!code || code.length !== 6) {
        document.getElementById('verifyError').textContent = 'کد باید ۶ رقم باشد.';
        return;
    }

    try {
        const user = await verifyUser(pendingUserId, code);
        currentUserId = user.id;
        currentUserData = user;
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

// ارسال مجدد کد
resendBtn.addEventListener('click', async () => {
    try {
        const user = await getUserData(pendingUserId);
        await simulateSendVerification(user.email);
        document.getElementById('verifyMessage').textContent = 'کد جدید به ایمیل شما ارسال شد.';
        document.getElementById('verifyMessage').style.color = '#34D399';
    } catch (error) {
        document.getElementById('verifyMessage').textContent = error.message;
        document.getElementById('verifyMessage').style.color = '#F87171';
    }
});

// ارسال ایده
submitIdeaBtn.addEventListener('click', async () => {
    try {
        await submitIdea(ideaInput.value);
        showFeedback('ایده شما ثبت شد', 'success');
        ideaInput.value = '';
        if (document.getElementById('myIdeasPage').classList.contains('active')) {
            loadMyIdeas();
        }
    } catch (error) {
        showFeedback(error.message, 'error');
    }
});

// منوی پایین
navItems.forEach(item => {
    item.addEventListener('click', function() {
        const pageId = this.dataset.page;
        if (!currentUserId && pageId !== 'landingPage' && pageId !== 'registerPage') {
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
    pendingUserId = null;
    showPage('landingPage');
});

// ============================================================
// مقداردهی اولیه
// ============================================================
checkUserSession();
