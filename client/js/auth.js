// ===== مدیریت احراز هویت =====
const API_BASE = 'https://ays-server.onrender.com/api'; // در production آدرس واقعی

// ارسال کد تایید
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('send-code-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const email = document.getElementById('reg-email').value.trim();
      if (!validateEmail(email)) {
        showToast('ایمیل معتبر وارد کن', 'error');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/request-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('کد تایید به ایمیلت ارسال شد');
        } else {
          showToast(data.message || 'خطا در ارسال کد', 'error');
        }
      } catch {
        showToast('مشکل در ارتباط با سرور', 'error');
      }
    });
  }

  // ثبت‌نام
  const form = document.getElementById('register-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const code = document.getElementById('reg-code').value.trim();
      const phoneCode = document.getElementById('reg-phone-code').value;
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirm = document.getElementById('reg-password-confirm').value;
      const terms = document.getElementById('reg-terms').checked;

      if (!name || !email || !code || !phone || !password || !confirm) {
        showToast('همه فیلدها را پر کن', 'error'); return;
      }
      if (!validateEmail(email)) { showToast('ایمیل نامعتبر', 'error'); return; }
      if (!validatePhone(phone)) { showToast('شماره تلفن نامعتبر', 'error'); return; }
      if (password !== confirm) { showToast('رمزها یکسان نیستند', 'error'); return; }
      if (!validatePassword(password)) { showToast('رمز حداقل ۶ کاراکتر', 'error'); return; }
      if (!terms) { showToast('قوانین را بپذیر', 'error'); return; }

      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email, phone: phoneCode + phone, password, code
          })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('ays_token', data.token);
          showToast('ثبت‌نام موفق!');
          navigateTo('main');
        } else {
          showToast(data.message || 'خطا در ثبت‌نام', 'error');
        }
      } catch {
        showToast('مشکل در ارتباط با سرور', 'error');
      }
    });
  }
});
