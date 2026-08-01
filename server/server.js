const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const morgan = require('morgan');
const { sendToTelegram } = require('./utils/telegram');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ays-super-secret-key-change-in-production';

// ============================================================
// ۱. Helmet.js - امنیت هدرهای HTTP
// ============================================================
app.use(helmet());

// ============================================================
// ۲. Morgan - لاگ‌گیری
// ============================================================
app.use(morgan('combined'));

// ============================================================
// ۳. CORS محدودتر
// ============================================================
const corsOptions = {
    origin: process.env.CLIENT_URL || 'https://ays365.onrender.com',
    optionsSuccessStatus: 200,
    credentials: true
};
app.use(cors(corsOptions));

// ============================================================
// ۴. محدودیت حجم درخواست‌ها
// ============================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// ۵. Rate Limiting
// ============================================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 100, // هر IP حداکثر ۱۰۰ درخواست
    message: { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate Limiting سخت‌تر برای ثبت‌نام و لاگین
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
});
app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

// ============================================================
// ۶. دیتابیس
// ============================================================
const dbPath = path.join(__dirname, 'database', 'ays.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
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

// ============================================================
// ۷. توابع کمکی
// ============================================================
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return validator.escape(input.trim());
}

function validateEmail(email) {
    return validator.isEmail(email) && validator.isLength(email, { max: 100 });
}

function validatePassword(password) {
    return validator.isLength(password, { min: 6, max: 100 });
}

function validateName(name) {
    return validator.isLength(name, { min: 2, max: 50 }) && validator.matches(name, /^[\u0600-\u06FFa-zA-Z\s]+$/);
}

function validateIdea(content) {
    const clean = validator.trim(content);
    return validator.isLength(clean, { min: 5, max: 5000 });
}

// ============================================================
// ۸. Middleware احراز هویت با JWT
// ============================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز. لطفاً وارد شوید.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'توکن نامعتبر. دوباره وارد شوید.' });
        }
        req.user = user;
        next();
    });
}

// ============================================================
// ۹. مسیرها
// ============================================================

// ------ ثبت‌نام (با هش کردن رمز) ------
app.post('/api/register', async (req, res) => {
    const { email, name, password } = req.body;

    // اعتبارسنجی
    if (!email || !name || !password) {
        return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'ایمیل معتبر وارد کنید.' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
    }
    if (!validateName(name)) {
        return res.status(400).json({ error: 'نام باید حداقل ۲ کاراکتر و فقط شامل حروف باشد.' });
    }

    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedName = sanitizeInput(name);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.get('SELECT id FROM users WHERE email = ?', [sanitizedEmail], (err, existing) => {
            if (err) {
                console.error('خطای دیتابیس:', err);
                return res.status(500).json({ error: 'خطای داخلی سرور' });
            }
            if (existing) {
                return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
            }

            db.run(
                'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
                [sanitizedEmail, sanitizedName, hashedPassword],
                function(err) {
                    if (err) {
                        console.error('خطا در ثبت‌نام:', err);
                        return res.status(500).json({ error: 'خطا در ثبت‌نام' });
                    }

                    const token = jwt.sign(
                        { id: this.lastID, email: sanitizedEmail },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );

                    res.status(201).json({
                        id: this.lastID,
                        email: sanitizedEmail,
                        name: sanitizedName,
                        token,
                        created_at: new Date().toISOString()
                    });
                }
            );
        });
    } catch (error) {
        console.error('خطا در هش کردن رمز:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

// ------ ورود (با بررسی رمز هش‌شده) ------
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'ایمیل معتبر وارد کنید.' });
    }

    const sanitizedEmail = validator.normalizeEmail(email);

    db.get(
        'SELECT id, email, name, password FROM users WHERE email = ?',
        [sanitizedEmail],
        async (err, user) => {
            if (err) {
                console.error('خطای دیتابیس:', err);
                return res.status(500).json({ error: 'خطای داخلی سرور' });
            }
            if (!user) {
                return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
            }

            try {
                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) {
                    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.json({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    token
                });
            } catch (error) {
                console.error('خطا در مقایسه رمز:', error);
                res.status(500).json({ error: 'خطای داخلی سرور' });
            }
        }
    );
});

// ------ دریافت اطلاعات کاربر (محافظت‌شده) ------
app.get('/api/user', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, email, name, created_at FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err) {
                console.error('خطای دیتابیس:', err);
                return res.status(500).json({ error: 'خطای داخلی سرور' });
            }
            if (!user) {
                return res.status(404).json({ error: 'کاربر یافت نشد' });
            }
            res.json(user);
        }
    );
});

// ------ دریافت اطلاعات کاربر با ID (برای استفاده در کلاینت) ------
app.get('/api/user/:id', authenticateToken, (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId !== req.user.id) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز به اطلاعات کاربر دیگر' });
    }

    db.get(
        'SELECT id, email, name, created_at FROM users WHERE id = ?',
        [userId],
        (err, user) => {
            if (err) {
                console.error('خطای دیتابیس:', err);
                return res.status(500).json({ error: 'خطای داخلی سرور' });
            }
            if (!user) {
                return res.status(404).json({ error: 'کاربر یافت نشد' });
            }
            res.json(user);
        }
    );
});

// ------ ثبت ایده (با فیلتر XSS و اعتبارسنجی) ------
app.post('/api/ideas', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'متن ایده الزامی است.' });
    }

    const sanitizedContent = sanitizeInput(content);
    if (!validateIdea(sanitizedContent)) {
        return res.status(400).json({ error: 'متن ایده باید حداقل ۵ کاراکتر و حداکثر ۵۰۰۰ کاراکتر باشد.' });
    }

    db.get('SELECT name, email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('خطای دیتابیس:', err);
            return res.status(500).json({ error: 'خطای داخلی سرور' });
        }
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        db.run(
            'INSERT INTO ideas (user_id, content) VALUES (?, ?)',
            [userId, sanitizedContent],
            function(err) {
                if (err) {
                    console.error('خطا در ذخیره ایده:', err);
                    return res.status(500).json({ error: 'خطا در ذخیره ایده' });
                }

                sendToTelegram(user.name, user.email, sanitizedContent);

                res.status(201).json({
                    id: this.lastID,
                    user_id: userId,
                    content: sanitizedContent,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            }
        );
    });
});

// ------ دریافت ایده‌های کاربر (محافظت‌شده) ------
app.get('/api/ideas', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
        'SELECT id, content, status, created_at FROM ideas WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, ideas) => {
            if (err) {
                console.error('خطا در دریافت ایده‌ها:', err);
                return res.status(500).json({ error: 'خطا در دریافت ایده‌ها' });
            }
            res.json(ideas);
        }
    );
});

// ------ سلامت سرور ------
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================
// ۱۰. راه‌اندازی سرور
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 سرور AYS روی پورت ${PORT} در حال اجرا است.`);
    console.log(`🔒 حالت امنیت: فعال (JWT, bcrypt, Helmet, Rate Limit, XSS Prevention)`);
});
