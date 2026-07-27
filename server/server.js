const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { sendToTelegram } = require('./utils/telegram');
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

app.post('/api/register', (req, res) => {
    const { phone, name, email, password } = req.body;

    if (!phone || !name || !email || !password) {
        return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    }

    db.get('SELECT id FROM users WHERE phone = ? OR email = ?', [phone, email], (err, existing) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (existing) return res.status(400).json({ error: 'این شماره یا ایمیل قبلاً ثبت شده است.' });

        db.run(
            'INSERT INTO users (phone, name, email, password) VALUES (?, ?, ?, ?)',
            [phone, name, email, password],
            function(err) {
                if (err) return res.status(500).json({ error: 'خطا در ثبت‌نام' });
                res.status(201).json({
                    id: this.lastID,
                    phone,
                    name,
                    email,
                    created_at: new Date().toISOString()
                });
            }
        );
    });
});

app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    db.get('SELECT id, phone, name, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        res.json(user);
    });
});

app.post('/api/ideas', (req, res) => {
    const { userId, content } = req.body;

    if (!userId || !content || content.trim().length < 5) {
        return res.status(400).json({ error: 'متن ایده باید حداقل ۵ کاراکتر باشد.' });
    }

    db.get('SELECT name, phone FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی سرور' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

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
