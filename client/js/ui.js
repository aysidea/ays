// ===== ابزارهای UI =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
}

function navigateTo(page) {
  showPage(page);
  if (page === 'main') {
    loadUserData();
    loadMyIdeas();
  }
}

function showToast(msg, type = 'info') {
  // نمایش پیام کوتاه - ساده
  const status = document.getElementById('idea-status') || document.createElement('div');
  status.textContent = msg;
  status.style.color = type === 'error' ? '#b84a4a' : '#6b6560';
  setTimeout(() => { status.textContent = ''; }, 4000);
}

// ===== اعتبارسنجی =====
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
  return /^[0-9]{7,15}$/.test(phone);
}
function validatePassword(pass) {
  return pass.length >= 6;
}
