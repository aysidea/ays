// ===== وضعیت کاربر =====
let currentUserId = localStorage.getItem('ays_user_id') || null;
let currentUserData = null;

// ===== المان‌های DOM =====
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

// ===== پایگاه داده محلی =====
const usersDB = JSON.parse(localStorage.getItem('ays_users')) || {};

function saveUsersToDB() {
    localStorage.setItem('ays_users', JSON.stringify(usersDB));
}

// ===== توابع احراز هویت =====
async function registerUser(phone, name, language) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const id = Date.now().toString();
            const user = { id, phone, name, language, createdAt: new Date().toISOString() };
            usersDB[id] = user;
            saveUsersToDB();
            resolve(user);
        }, 300);
    });
}

// ===== نمایش صفحات =====
function showPage(pageId) {
    // جلوگیری از دسترسی کاربر لاگین به صفحات عمومی
    const publicPages = ['landingPage', 'registerPage'];
    if (currentUserId && publicPages.includes(pageId)) {
        pageId = 'dashboardPage';
    }

    // مخفی کردن همه صفحات
    Object.values(pages).forEach(p => {
        if (p) p.classList.remove('active');
    });

    // نمایش صفحه مورد نظر
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    } else {
        console.error('صفحه یافت نشد:', pageId);
        return;
    }

    // به‌روزرسانی ناوبری
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // ===== مدیریت هدر و منوی پایین =====
    const header = document.getElementById('mainHeader');
    const bottomNav = document.querySelector('.bottom-nav');
    const hidePages = ['landingPage', 'registerPage'];

    if (hidePages.includes(pageId)) {
        if (header) header.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        document.body.style.paddingTop = '0';
        document.body.style.paddingBottom = '0';
    } else {
        if (header) header.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = 'flex';
        document.body.style.paddingTop = '70px';
        document.body.style.paddingBottom = '80px';
    }

    // بارگذاری داده‌های خاص
    if (pageId === 'myIdeasPage' && currentUserId) loadMyIdeas();
    if (pageId === 'accountPage' && currentUserId) loadAccountInfo();
}

// ===== بارگذاری داده‌ها =====
function loadMyIdeas() {
    document.getElementById('myIdeasList').innerHTML = '<p>لیست ایده‌های شما...</p>';
}

function loadPublicIdeas() {
    document.getElementById('publicIdeasList').innerHTML = '<p>ایده‌های عمومی...</p>';
}

function loadAccountInfo() {
    const container = document.getElementById('accountInfo');
    if (currentUserData) {
        container.innerHTML = `
            <p><strong>نام:</strong> ${currentUserData.name}</p>
            <p><strong>شماره:</strong> ${currentUserData.phone}</p>
            <p><strong>زبان:</strong> ${currentUserData.language}</p>
        `;
    } else {
        container.innerHTML = '<p>اطلاعاتی یافت نشد.</p>';
    }
}

// ===== بررسی نشست =====
function checkUserSession() {
    if (currentUserId && usersDB[currentUserId]) {
        currentUserData = usersDB[currentUserId];
        showPage('dashboardPage');
        return true;
    } else {
        localStorage.removeItem('ays_user_id');
        currentUserId = null;
        showPage('landingPage');
        return false;
    }
}

// ===== رویدادها =====
startBtn.addEventListener('click', () => {
    currentUserId ? showPage('dashboardPage') : showPage('registerPage');
});

goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    alert('برای ورود شماره موبایل خود را وارد کنید.');
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value.trim();
    const name = document.getElementById('name').value.trim();
    const language = document.getElementById('language').value;

    if (!phone || !name) {
        alert('لطفاً همه فیلدها را پر کنید.');
        return;
    }

    // بررسی کاربر قبلی
    const existing = Object.values(usersDB).find(u => u.phone === phone);
    if (existing) {
        currentUserId = existing.id;
        currentUserData = existing;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        alert('خوش آمدید!');
        return;
    }

    // ثبت‌نام جدید
    try {
        const user = await registerUser(phone, name, language);
        currentUserId = user.id;
        currentUserData = user;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        alert('ثبت‌نام موفق!');
        registerForm.reset();
    } catch (error) {
        alert('خطا: ' + error.message);
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ays_user_id');
    currentUserId = null;
    currentUserData = null;
    showPage('landingPage');
});

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
});

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        if (currentUserId) {
            showPage(pageId);
        } else {
            showPage('landingPage');
        }
    });
});

// ===== راه‌اندازی اولیه =====
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.paddingTop = '70px';
    document.body.style.paddingBottom = '80px';
    checkUserSession();
    loadPublicIdeas();
});
