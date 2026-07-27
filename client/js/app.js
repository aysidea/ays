// ============================================================
// مدیریت وضعیت کاربر
// ============================================================
let currentUserId = localStorage.getItem('ays_user_id') || null;
let currentUserData = null;

// ============================================================
// المان‌های DOM
// ============================================================
const pages = {
    landingPage: document.getElementById('landingPage'),
    registerPage: document.getElementById('registerPage'),
    dashboardPage: document.getElementById('dashboardPage'),
    myIdeasPage: document.getElementById('myIdeasPage'),
    publicIdeasPage: document.getElementById('publicIdeasPage'),
    accountPage: document.getElementById('accountPage'),
};

const navItems = document.querySelectorAll('.nav-item');
const startBtn = document.getElementById('startBtn');
const goToLogin = document.getElementById('goToLogin');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');

// ============================================================
// توابع کمکی
// ============================================================
function showPage(pageId) {
    // ============================================================
    // تغییر جدید: جلوگیری از دسترسی کاربران لاگین به صفحات عمومی
    // ============================================================
    const publicPages = ['landingPage', 'registerPage'];
    if (currentUserId && publicPages.includes(pageId)) {
        pageId = 'dashboardPage'; // هدایت به داشبورد
    }

    // مخفی کردن تمام صفحات
    Object.values(pages).forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    // به‌روزرسانی ناوبری پایین
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // ============================================================
    // تغییر جدید: مدیریت هدر و منوی پایین
    // ============================================================
    const header = document.getElementById('mainHeader');
    const bottomNav = document.querySelector('.bottom-nav');

    // صفحاتی که هدر و منو نباید نمایش داده شوند
    const hideHeaderAndNavPages = ['landingPage', 'registerPage'];

    if (hideHeaderAndNavPages.includes(pageId)) {
        if (header) header.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        document.body.style.paddingTop = '0';
        document.body.style.paddingBottom = '0';
    } else {
        if (header) header.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = 'flex';
        document.body.style.paddingTop = '70px';   // فضای هدر
        document.body.style.paddingBottom = '80px'; // فضای منوی پایین
    }

    // بارگذاری داده‌های خاص هر صفحه
    if (pageId === 'myIdeasPage' && currentUserId) {
        loadMyIdeas();
    }
    if (pageId === 'accountPage' && currentUserId) {
        loadAccountInfo();
    }
}

// ============================================================
// شبیه‌سازی سرور (برای ذخیره‌سازی اطلاعات)
// ============================================================
const usersDB = JSON.parse(localStorage.getItem('ays_users')) || {};

function saveUsersToDB() {
    localStorage.setItem('ays_users', JSON.stringify(usersDB));
}

// ============================================================
// توابع احراز هویت
// ============================================================
async function registerUser(phone, name, language) {
    // شبیه‌سازی ثبت‌نام در سرور
    return new Promise((resolve) => {
        setTimeout(() => {
            const id = Date.now().toString();
            const user = { id, phone, name, language, createdAt: new Date().toISOString() };
            usersDB[id] = user;
            saveUsersToDB();
            resolve(user);
        }, 500);
    });
}

async function loginUser(phone) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = Object.values(usersDB).find(u => u.phone === phone);
            if (user) {
                resolve(user);
            } else {
                reject(new Error('کاربر یافت نشد'));
            }
        }, 500);
    });
}

function checkUserSession() {
    if (currentUserId && usersDB[currentUserId]) {
        currentUserData = usersDB[currentUserId];
        showPage('dashboardPage');
        return true;
    } else {
        // اگر توکن نامعتبر بود، پاکش کن
        localStorage.removeItem('ays_user_id');
        currentUserId = null;
        showPage('landingPage');
        return false;
    }
}

// ============================================================
// بارگذاری داده‌های صفحات
// ============================================================
function loadMyIdeas() {
    const container = document.getElementById('myIdeasList');
    container.innerHTML = '<p>ایده‌های خود را اینجا مشاهده کنید.</p>';
    // در نسخه واقعی، از سرور دریافت می‌شود
}

function loadPublicIdeas() {
    const container = document.getElementById('publicIdeasList');
    container.innerHTML = '<p>ایده‌های عمومی کاربران دیگر.</p>';
}

function loadAccountInfo() {
    const container = document.getElementById('accountInfo');
    if (currentUserData) {
        container.innerHTML = `
            <p><strong>نام:</strong> ${currentUserData.name}</p>
            <p><strong>شماره موبایل:</strong> ${currentUserData.phone}</p>
            <p><strong>زبان:</strong> ${currentUserData.language}</p>
            <p><strong>تاریخ عضویت:</strong> ${new Date(currentUserData.createdAt).toLocaleDateString('fa-IR')}</p>
        `;
    } else {
        container.innerHTML = '<p>اطلاعاتی یافت نشد.</p>';
    }
}

// ============================================================
// رویدادها
// ============================================================

// شروع از صفحه خوش‌آمدگویی
startBtn.addEventListener('click', () => {
    if (currentUserId) {
        showPage('dashboardPage');
    } else {
        showPage('registerPage');
    }
});

// رفتن به صفحه ورود (در صورت وجود)
goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    // در این نسخه، ثبت‌نام و ورود یکی است، اما می‌توانید صفحه ورود جداگانه بسازید
    alert('برای ورود، شماره موبایل خود را وارد کنید. (فعلاً ثبت‌نام و ورود یکی است)');
});

// ثبت‌نام
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value.trim();
    const name = document.getElementById('name').value.trim();
    const language = document.getElementById('language').value;

    if (!phone || !name) {
        alert('لطفاً تمام فیلدها را پر کنید.');
        return;
    }

    try {
        // بررسی آیا کاربر قبلاً ثبت‌نام کرده است؟
        const existingUser = Object.values(usersDB).find(u => u.phone === phone);
        if (existingUser) {
            // اگر وجود دارد، لاگین کن
            currentUserId = existingUser.id;
            currentUserData = existingUser;
            localStorage.setItem('ays_user_id', currentUserId);
            showPage('dashboardPage');
            alert('خوش آمدید!');
            return;
        }

        // ثبت‌نام جدید
        const user = await registerUser(phone, name, language);
        currentUserId = user.id;
        currentUserData = user;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        alert('ثبت‌نام با موفقیت انجام شد!');
        registerForm.reset();
    } catch (error) {
        alert('خطا در ثبت‌نام: ' + error.message);
    }
});

// خروج
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ays_user_id');
    currentUserId = null;
    currentUserData = null;
    showPage('landingPage');
});

// تغییر تم (فقط برای نمایش)
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
});

// کلیک روی آیتم‌های ناوبری
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        if (pageId && currentUserId) {
            showPage(pageId);
        } else if (!currentUserId) {
            showPage('landingPage');
        }
    });
});

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', () => {
    // تنظیم padding پیش‌فرض (در صورت نمایش هدر و منو)
    document.body.style.paddingTop = '70px';
    document.body.style.paddingBottom = '80px';

    // بررسی نشست کاربر
    const hasSession = checkUserSession();
    if (!hasSession) {
        showPage('landingPage');
    }

    // بارگذاری ایده‌های عمومی در پس‌زمینه
    loadPublicIdeas();
});
