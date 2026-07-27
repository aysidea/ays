const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { sendToTelegram } = require('./utils/telegram');
const { sendVerificationEmail } = require('./utils/email');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'database', 'ays.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
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
});

// ===== ثبت‌نام =====
app.post('/api/register', (req, res) => {
    const { phone, name, email, password } = req.body;

    if (!phone || !name || !email || !password) {
        return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    }

    db.get('SELECT id FROM users WHERE phone = ? OR email = ?', [phone, email], (err, existing) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (existing) return res.status(400).json({ error: 'این شماره یا ایمیل قبلاً ثبت شده است.' });

        db.run(
            'INSERT INTO users (phone, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
            [phone, name, email, password, 'pending'],
            function(err) {
                if (err) return res.status(500).json({ error: 'خطا در ثبت‌نام' });
                res.status(201).json({
                    id: this.lastID,
                    phone,
                    name,
                    email,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            }
        );
    });
});

// ===== ارسال کد تأیید به ایمیل =====
app.post('/api/send-verification', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'شناسه کاربر الزامی است.' });
    }

    db.get('SELECT email, name FROM users WHERE id = ? AND status = "pending"', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد یا قبلاً تأیید شده است.' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 دقیقه

        db.run(
            'INSERT INTO verifications (user_id, code, expires_at) VALUES (?, ?, ?)',
            [userId, code, expiresAt],
            function(err) {
                if (err) return res.status(500).json({ error: 'خطا در ذخیره کد' });

                // ارسال ایمیل
                sendVerificationEmail(user.email, user.name, code)
                    .then(() => {
                        res.json({ message: 'کد تأیید به ایمیل ارسال شد.' });
                    })
                    .catch((emailErr) => {
                        console.error('خطا در ارسال ایمیل:', emailErr);
                        res.status(500).json({ error: 'خطا در ارسال ایمیل. دوباره تلاش کنید.' });
                    });
            }
        );
    });
});

// ===== تأیید کد =====
app.post('/api/verify-code', (req, res) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'شناسه کاربر و کد الزامی هستند.' });
    }

    db.get(
        'SELECT * FROM verifications WHERE user_id = ? AND code = ? AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1',
        [userId, code],
        (err, verification) => {
            if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
            if (!verification) {
                return res.status(400).json({ error: 'کد اشتباه یا منقضی شده است.' });
            }

            // تأیید کاربر
            db.run('UPDATE users SET status = "active" WHERE id = ?', [userId], function(err) {
                if (err) return res.status(500).json({ error: 'خطا در فعال‌سازی حساب' });

                db.get('SELECT id, phone, name, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
                    if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
                    res.json({ message: 'حساب کاربری فعال شد.', user });
                });
            });
        }
    );
});

// ===== ورود =====
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند.' });
    }

    db.get(
        'SELECT id, name, phone, email, created_at FROM users WHERE email = ? AND password = ? AND status = "active"',
        [email, password],
        (err, user) => {
            if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
            if (!user) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است یا حساب فعال نیست.' });
            res.json(user);
        }
    );
});

// ===== دریافت اطلاعات کاربر =====
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    db.get('SELECT id, phone, name, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        res.json(user);
    });
});

// ===== ثبت ایده =====
app.post('/api/ideas', (req, res) => {
    const { userId, content } = req.body;

    if (!userId || !content || content.trim().length < 5) {
        return res.status(400).json({ error: 'متن ایده باید حداقل ۵ کاراکتر باشد.' });
    }

    db.get('SELECT name, phone FROM users WHERE id = ? AND status = "active"', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد یا حساب فعال نیست.' });

        db.run('INSERT INTO ideas (user_id, content) VALUES (?, ?)', [userId, content.trim()], function(err) {
            if (err) return res.status(500).json({ error: 'خطا در ذخیره ایده' });

            sendToTelegram(user.name, user.phone, content.trim());

            res.status(201).json({
                id: this.lastID,
                user_id: userId,
                content: content.trim(),
                status: 'pending',
                created_at: new Date().toISOString()
            });
        });
    });
});

// ===== دریافت ایده‌های کاربر =====
app.get('/api/ideas', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'شناسه کاربر الزامی است.' });

    db.all(
        'SELECT id, content, status, created_at FROM ideas WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, ideas) => {
            if (err) return res.status(500).json({ error: 'خطا در دریافت ایده‌ها' });
            res.json(ideas);
        }
    );
});

app.listen(PORT, () => {
    console.log(`سرور AYS روی پورت ${PORT} در حال اجرا است.`);
});
