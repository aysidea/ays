const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('./utils/email');
const { sendToTelegram } = require('./utils/telegram');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== دیتابیس =====
const db = new sqlite3.Database('./database/ays.db', (err) => {
  if (err) console.error('DB error:', err);
  else console.log('✅ Connected to SQLite');
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// ===== توابع کمکی =====
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'توکن ارائه نشده' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'توکن نامعتبر' });
  }
};

// ===== API =====

// 1. درخواست کد تایید
app.post('/api/request-verification', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'ایمیل نامعتبر' });
  }
  // بررسی وجود ایمیل تکراری
  db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
    if (user) return res.status(400).json({ message: 'این ایمیل قبلاً ثبت شده' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60000).toISOString();
    db.run('INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)', [email, code, expires]);
    try {
      await sendVerificationEmail(email, code);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: 'خطا در ارسال ایمیل' });
    }
  });
});

// 2. ثبت‌نام کامل
app.post('/api/register', (req, res) => {
  const { name, email, phone, password, code } = req.body;
  if (!name || !email || !phone || !password || !code) {
    return res.status(400).json({ message: 'همه فیلدها الزامی است' });
  }
  if (password.length < 6) return res.status(400).json({ message: 'رمز حداقل ۶ کاراکتر' });

  // بررسی کد
  db.get(
    'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime("now")',
    [email, code],
    async (err, record) => {
      if (!record) return res.status(400).json({ message: 'کد نامعتبر یا منقضی' });
      // هش رمز
      const hashed = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
        [name, email, phone, hashed],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ message: 'ایمیل تکراری' });
            return res.status(500).json({ message: 'خطای سرور' });
          }
          // علامت استفاده کد
          db.run('UPDATE verification_codes SET used = 1 WHERE id = ?', [record.id]);
          const token = generateToken({ id: this.lastID, email });
          res.json({ token, user: { id: this.lastID, name, email, phone } });
        }
      );
    }
  );
});

// 3. تأیید توکن
app.get('/api/verify', verifyToken, (req, res) => {
  res.json({ valid: true });
});

// 4. دریافت اطلاعات کاربر
app.get('/api/me', verifyToken, (req, res) => {
  db.get('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });
    res.json(user);
  });
});

// 5. ثبت ایده
app.post('/api/ideas', verifyToken, (req, res) => {
  const { content } = req.body;
  if (!content || content.length < 5) {
    return res.status(400).json({ message: 'ایده حداقل ۵ کاراکتر' });
  }
  db.run(
    'INSERT INTO ideas (user_id, content) VALUES (?, ?)',
    [req.userId, content],
    function(err) {
      if (err) return res.status(500).json({ message: 'خطا در ذخیره ایده' });
      // ارسال به تلگرام
      db.get('SELECT name, phone FROM users WHERE id = ?', [req.userId], (err2, user) => {
        if (user) sendToTelegram(user.name, user.phone, content);
      });
      res.status(201).json({ id: this.lastID, content, status: 'pending' });
    }
  );
});

// 6. دریافت ایده‌های کاربر
app.get('/api/ideas', verifyToken, (req, res) => {
  db.all('SELECT id, content, status, created_at FROM ideas WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => {
    res.json(rows || []);
  });
});

// 7. سلامت
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ===== شروع =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
