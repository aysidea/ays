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
const winston = require('winston');
const { sendToTelegram } = require('./utils/telegram');
const { sendAlertToTelegram } = require('./utils/alert');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ays-super-secret-key-change-in-production';

// ============================================================
// ۱. لاگر (Winston)
// ============================================================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// ============================================================
// ۲. Helmet.js
// ============================================================
app.use(helmet());

// ============================================================
// ۳. Morgan
// ============================================================
app.use(morgan('combined'));

// ============================================================
// ۴. CORS
// ============================================================
const corsOptions = {
    origin: process.env.CLIENT_URL || 'https://ays365.onrender.com',
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ============================================================
// ۵. محدودیت حجم
// ============================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// ۶. Rate Limiting
// ============================================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
});
app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

// ============================================================
// ۷. دیتابیس
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
// ۸. توابع کمکی
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
// ۹. Middleware تشخیص حملات (SQL Injection, XSS, ...)
// ============================================================
function detectAttack(req, res, next) {
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /alert\(/i,
        /onerror=/i,
        /onclick=/i,
        /SELECT.*FROM/i,
        /DROP.*TABLE/i,
        /INSERT.*INTO/i,
        /UNION.*SELECT/i,
        /--/,
        /;/,
        /\/\*/,
        /\*\//,
    ];

    const check = (value) => {
        if (typeof value !== 'string') return false;
        return dangerousPatterns.some(pattern => pattern.test(value));
    };

    const body = req.body || {};
    const query = req.query || {};
    const params = req.params || {};

    const allData = { ...body, ...query, ...params };
    let found = false;
    let detectedValue = '';

    for (const [key, value] of Object.entries(allData)) {
        if (typeof value === 'string' && check(value)) {
            found = true;
            detectedValue = value;
            break;
        }
        if (typeof value === 'object' && value !== null) {
            const jsonString = JSON.stringify(value);
            if (check(jsonString)) {
                found = true;
                detectedValue = jsonString;
                break;
            }
        }
    }

    if (found) {
        const alertMessage = `🚨 تلاش برای نفوذ شناسایی شد!\nالگوی مخرب: ${detectedValue.substring(0, 100)}`;
        sendAlertToTelegram('SECURITY', alertMessage, {
            ip: req.ip || req.connection.remoteAddress,
            path: req.path,
            user: req.user?.email || 'کاربر مهمان',
        });
        logger.warn(`🚨 حمله شناسایی شد: ${req.path} از ${req.ip}`);
        return res.status(403).json({ error: 'درخواست غیرمجاز' });
    }

    next();
}

app.use(detectAttack);

// ============================================================
// ۱۰. Middleware احراز هویت JWT
// ============================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز. لطفاً وارد شوید.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // هشدار برای توکن نامعتبر
            sendAlertToTelegram('WARNING', `⚠️ توکن نامعتبر یا منقضی: ${err.message}`, {
                ip: req.ip || req.connection.remoteAddress,
                path: req.path,
                user: req.user?.email || 'کاربر مهمان',
            });
            logger.warn(`⚠️ خطای JWT: ${err.message} - ${req.path} - ${req.ip}`);
            return res.status(403).json({ error: 'توکن نامعتبر. دوباره وارد شوید.' });
        }
        req.user = user;
        next();
    });
}

// ============================================================
// ۱۱. مسیرها
// ============================================================
app.post('/api/register', async (req, res) => {
    console.log('📨 دریافت درخواست ثبت‌نام:', req.body);

    const { email, name, password } = req.body;

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

                    console.log('✅ ثبت‌نام موفق:', sanitizedEmail);
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

app.post('/api/login', async (req, res) => {
    console.log('📨 دریافت درخواست ورود:', req.body);

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

                console.log('✅ ورود موفق:', user.email);
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

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================
// ۱۲. هشدار در صورت Rate Limit exceeded
// ============================================================
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        if (res.statusCode === 429) {
            sendAlertToTelegram('WARNING', '⚠️ محدودیت نرخ درخواست (Rate Limit) فعال شد!', {
                ip: req.ip || req.connection.remoteAddress,
                path: req.path,
                user: req.user?.email || 'کاربر مهمان',
            });
            logger.warn(`⚠️ Rate Limit exceeded: ${req.path} از ${req.ip}`);
        }
        originalSend.call(this, data);
    };
    next();
});

// ============================================================
// ۱۳. Global Error Handler با هشدار
// ============================================================
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || 'خطای داخلی سرور';

    logger.error(`❌ ${statusCode} - ${message} - ${req.path} - ${req.ip}`);

    if (statusCode >= 500) {
        sendAlertToTelegram('ERROR', message, {
            ip: req.ip || req.connection.remoteAddress,
            path: req.path,
            user: req.user?.email || 'کاربر مهمان',
            stack: err.stack,
        });
    }

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================================
// ۱۴. راه‌اندازی سرور
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 سرور AYS روی پورت ${PORT} در حال اجرا است.`);
    console.log(`🔒 حالت امنیت: فعال (JWT, bcrypt, Helmet, Rate Limit, XSS Prevention, Alert System)`);
});
