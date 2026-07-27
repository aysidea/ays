const API_BASE_URL = 'https://ays-server.onrender.com/api';
let currentUserId = localStorage.getItem('ays_user_id');
let pendingUserId = null;

const currentPage = window.location.pathname.split('/').pop();

// ===== توابع کمکی =====
function setError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    const registerError = document.getElementById('registerError');
    if (registerError) registerError.textContent = '';
    const verifyError = document.getElementById('verifyError');
    if (verifyError) verifyError.textContent = '';
    const verifyMessage = document.getElementById('verifyMessage');
    if (verifyMessage) verifyMessage.textContent = '';
}

function showFeedback(message, type = 'success') {
    const el = document.getElementById('ideaFeedback');
    if (!el) return;
    el.textContent = message;
    el.className = 'feedback show ' + type;
    setTimeout(() => {
        el.className = 'feedback';
    }, 4000);
}

// ===== مدیریت احراز هویت =====
async function registerUser(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
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

async function getUserData(userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`);
    if (!response.ok) throw new Error('کاربر یافت نشد');
    return response.json();
}

function checkUserSession() {
    if (!currentUserId) {
        if (currentPage !== 'index.html' && currentPage !== 'register.html') {
            window.location.href = 'index.html';
        }
        return;
    }

    getUserData(currentUserId)
        .then(user => {
            if (user.status === 'pending') {
                localStorage.removeItem('ays_user_id');
                currentUserId = null;
                if (currentPage !== 'index.html' && currentPage !== 'register.html') {
                    window.location.href = 'index.html';
                }
                return;
            }
            if (currentPage === 'index.html' || currentPage === 'register.html') {
                window.location.href = 'dashboard.html';
            }
        })
        .catch(() => {
            localStorage.removeItem('ays_user_id');
            currentUserId = null;
            if (currentPage !== 'index.html' && currentPage !== 'register.html') {
                window.location.href = 'index.html';
            }
        });
}

// ===== مدیریت ایده‌ها =====
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
        document.getElementById('ideaInput').value = '';
        return true;
    } catch (error) {
        showFeedback(error.message, 'error');
        return false;
    }
}

// ===== رویدادهای صفحه ثبت‌نام =====
if (currentPage === 'register.html') {
    const registerForm = document.getElementById('registerForm');
    const verifySection = document.getElementById('verifySection');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendBtn = document.getElementById('resendBtn');
    const verifyCodeInput = document.getElementById('verifyCode');

    function validateRegisterForm() {
        clearErrors();
        let isValid = true;

        const name = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
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

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateRegisterForm()) return;

        const name = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const user = await registerUser(name, email, password);
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
            localStorage.setItem('ays_user_id', pendingUserId);
            window.location.href = 'dashboard.html';
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
}

// ===== رویدادهای صفحه اصلی (داشبورد) =====
if (currentPage === 'dashboard.html') {
    const submitIdeaBtn = document.getElementById('submitIdeaBtn');
    const ideaInput = document.getElementById('ideaInput');

    submitIdeaBtn.addEventListener('click', async () => {
        await submitIdea(ideaInput.value);
    });

    // ناوبری منو
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page !== 'dashboard') {
                alert('این صفحه در حال توسعه است.');
                return;
            }
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// ===== بررسی نشست کاربر =====
checkUserSession();
