// ============================================================
// تنظیمات اولیه
// ============================================================
const API_BASE_URL = 'http://localhost:3000/api'; // در تولید، آدرس سرور واقعی قرار می‌گیرد
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

    // به‌روزرسانی ناوبری پایین
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // بارگذاری داده‌های خاص هر صفحه
    if (pageId === 'myIdeasPage' && currentUserId) {
        loadMyIdeas();
    }
    if (pageId === 'accountPage' && currentUserId) {
        loadAccountInfo();
    }
}

function showFeedback(message, isSuccess = true) {
    ideaFeedback.textContent = message;
    ideaFeedback.style.color = isSuccess ? '#28a745' : '#dc3545';
    ideaFeedback.classList.add('show');
    setTimeout(() => {
        ideaFeedback.classList.remove('show');
    }, 3000);
}

// ============================================================
// مدیریت احراز هویت
// ============================================================
async function registerUser(phone, name, language) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, name, language })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطا در ثبت‌نام');
        }
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
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
        currentUserData = user;
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
        showFeedback('لطفاً ابتدا ثبت‌نام کنید.', false);
        return false;
    }
    if (!content || content.trim().length < 5) {
        showFeedback('لطفاً متن ایده را با جزئیات بیشتر وارد کنید.', false);
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                content: content.trim()
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطا در ارسال ایده');
        }
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
        const response = await fetch(`${API_BASE_URL}/ideas?userId=${currentUserId}`);
        if (!response.ok) throw new Error('خطا در دریافت ایده‌ها');
        const ideas = await response.json();

        if (ideas.length === 0) {
            ideasList.innerHTML = '<p style="color: #6C757D; text-align: center;">هنوز ایده‌ای ثبت نکرده‌اید.</p>';
            return;
        }

        ideasList.innerHTML = ideas.map(idea => `
            <div class="idea-item">
                <div class="idea-content">${idea.content}</div>
                <div class="idea-meta">
                    <span>وضعیت: ${idea.status === 'pending' ? 'در انتظار بررسی' : idea.status === 'approved' ? 'تأیید شده' : 'رد شده'}</span>
                    <span>${new Date(idea.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        ideasList.innerHTML = '<p style="color: #dc3545;">خطا در دریافت ایده‌ها. دوباره تلاش کنید.</p>';
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
            <p><strong>نام:</strong> ${user.name}</p>
            <p><strong>شماره تلفن:</strong> ${user.phone}</p>
            <p><strong>زبان:</strong> ${user.language === 'fa' ? 'فارسی' : 'انگلیسی'}</p>
            <p><strong>تاریخ ثبت‌نام:</strong> ${new Date(user.created_at).toLocaleDateString('fa-IR')}</p>
        `;
    } catch (error) {
        accountInfo.innerHTML = '<p style="color: #dc3545;">خطا در دریافت اطلاعات.</p>';
    }
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
    const phone = document.getElementById('phone').value.trim();
    const name = document.getElementById('fullname').value.trim();
    const language = document.getElementById('language').value;

    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    if (!phone || !name) {
        errorEl.textContent = 'همه فیلدها را پر کنید.';
        return;
    }

    try {
        const user = await registerUser(phone, name, language);
        currentUserId = user.id;
        currentUserData = user;
        localStorage.setItem('ays_user_id', currentUserId);
        showPage('dashboardPage');
        registerForm.reset();
    } catch (error) {
        errorEl.textContent = error.message;
    }
});

// ارسال ایده
submitIdeaBtn.addEventListener('click', async () => {
    const content = ideaInput.value;
    await submitIdea(content);
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

// خروج از حساب
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
