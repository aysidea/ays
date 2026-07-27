// ===== اپلیکیشن اصلی =====
const API_BASE = 'https://ays-server.onrender.com/api';

// بررسی نشست
async function checkSession() {
  const token = localStorage.getItem('ays_token');
  if (!token) {
    showPage('welcome');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      navigateTo('main');
    } else {
      localStorage.removeItem('ays_token');
      showPage('welcome');
    }
  } catch {
    showPage('welcome');
  }
}

// بارگذاری اطلاعات کاربر
async function loadUserData() {
  const token = localStorage.getItem('ays_token');
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await res.json();
    if (res.ok) {
      document.getElementById('acc-name').textContent = user.name;
      document.getElementById('acc-email').textContent = user.email;
      document.getElementById('acc-phone').textContent = user.phone;
      document.getElementById('acc-created').textContent = new Date(user.created_at).toLocaleDateString('fa-IR');
    }
  } catch { /* ignore */ }
}

// بارگذاری ایده‌های من
async function loadMyIdeas() {
  const token = localStorage.getItem('ays_token');
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/ideas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ideas = await res.json();
    const container = document.getElementById('ideas-list');
    if (!container) return;
    if (!ideas.length) {
      container.innerHTML = '<p style="color:var(--text-secondary)">هنوز ایده‌ای ثبت نکردی</p>';
      return;
    }
    container.innerHTML = ideas.map(idea => `
      <div class="idea-card">
        <div class="idea-content">${idea.content}</div>
        <span class="idea-status-badge">${idea.status === 'pending' ? 'در انتظار' : idea.status === 'approved' ? 'تأیید' : 'رد'}</span>
        <div class="idea-date">${new Date(idea.created_at).toLocaleDateString('fa-IR')}</div>
      </div>
    `).join('');
  } catch { /* ignore */ }
}

// ثبت ایده جدید
async function submitIdea() {
  const content = document.getElementById('idea-content').value.trim();
  if (content.length < 5) {
    showToast('ایده حداقل ۵ کاراکتر', 'error');
    return;
  }
  const token = localStorage.getItem('ays_token');
  if (!token) { showToast('لطفاً وارد شوید', 'error'); return; }
  try {
    const res = await fetch(`${API_BASE}/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('ایده با موفقیت ثبت شد');
      document.getElementById('idea-content').value = '';
      loadMyIdeas();
    } else {
      showToast(data.message || 'خطا در ثبت ایده', 'error');
    }
  } catch {
    showToast('مشکل در ارتباط با سرور', 'error');
  }
}

// خروج
function logout() {
  localStorage.removeItem('ays_token');
  showPage('welcome');
}

// ===== ناوبری =====
document.addEventListener('DOMContentLoaded', () => {
  // منوی اصلی
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.page;
      document.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`sub-${page}`).classList.add('active');
      if (page === 'my-ideas') loadMyIdeas();
      if (page === 'account') loadUserData();
    });
  });

  // شروع
  checkSession();
});
