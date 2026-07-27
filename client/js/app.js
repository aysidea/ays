// ============================================================
// المان‌ها
// ============================================================
const pages = document.querySelectorAll('.page');
const header = document.getElementById('mainHeader');
const bottomNav = document.getElementById('bottomNav');
const navItems = document.querySelectorAll('.nav-item');
const startBtn = document.getElementById('startBtn');
const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

// ============================================================
// تابع نمایش صفحه
// ============================================================
function showPage(pageId) {
    // مخفی کردن همه صفحات
    pages.forEach(p => p.classList.remove('active'));

    // نمایش صفحه مورد نظر
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    }

    // به‌روزرسانی منوی پایین
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // نمایش هدر و منو فقط در صفحات داخلی
    const internalPages = ['dashboardPage', 'myIdeasPage', 'aboutPage', 'accountPage'];
    if (internalPages.includes(pageId)) {
        header.classList.add('visible');
        bottomNav.classList.add('visible');
    } else {
        header.classList.remove('visible');
        bottomNav.classList.remove('visible');
    }
}

// ============================================================
// رویدادها
// ============================================================

// رفتن به صفحه ثبت‌نام
startBtn.addEventListener('click', function() {
    showPage('registerPage');
});

// منوی پایین
navItems.forEach(item => {
    item.addEventListener('click', function() {
        const pageId = this.dataset.page;
        showPage(pageId);
    });
});

// ثبت‌نام (شبیه‌سازی شده)
registerForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;

    // اعتبارسنجی
    if (!name || !email || !phone || !password || !confirm) {
        registerMessage.textContent = '❌ همه فیلدها را پر کنید.';
        registerMessage.style.color = '#EF4444';
        return;
    }

    if (password.length < 6) {
        registerMessage.textContent = '❌ رمز عبور حداقل ۶ کاراکتر باشد.';
        registerMessage.style.color = '#EF4444';
        return;
    }

    if (password !== confirm) {
        registerMessage.textContent = '❌ رمزها مطابقت ندارند.';
        registerMessage.style.color = '#EF4444';
        return;
    }

    // موفقیت
    registerMessage.textContent = '✅ ثبت‌نام موفق! به صفحه اصلی هدایت می‌شوید.';
    registerMessage.style.color = '#10B981';

    setTimeout(() => {
        showPage('dashboardPage');
        registerMessage.textContent = '';
        registerForm.reset();
    }, 1200);
});

// ============================================================
// مقداردهی اولیه
// ============================================================
showPage('landingPage');
