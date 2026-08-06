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

app.use(helmet());
app.use(morgan('combined'));

const corsOptions = {
    origin: process.env.CLIENT_URL || 'https://ays365.onrender.com',
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' },
});
app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

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
            category TEXT,
            keywords TEXT,
            innovation INTEGER DEFAULT 0,
            market INTEGER DEFAULT 0,
            stage INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            topic TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

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

function detectAttack(req, res, next) {
    const patterns = [/<script/i, /javascript:/i, /alert\(/i, /onerror=/i, /onclick=/i,
        /SELECT.*FROM/i, /DROP.*TABLE/i, /INSERT.*INTO/i, /UNION.*SELECT/i, /--/, /;/, /\/\*/, /\*\//];
    const allData = { ...req.body, ...req.query, ...req.params };
    let found = false, detected = '';
    for (const [key, value] of Object.entries(allData)) {
        if (typeof value === 'string' && patterns.some(p => p.test(value))) {
            found = true; detected = value; break;
        }
        if (typeof value === 'object' && value !== null) {
            const json = JSON.stringify(value);
            if (patterns.some(p => p.test(json))) { found = true; detected = json; break; }
        }
    }
    if (found) {
        sendAlertToTelegram('SECURITY', `🚨 تلاش برای نفوذ: ${detected.substring(0, 100)}`, {
            ip: req.ip, path: req.path, user: req.user?.email || 'مهمان'
        });
        logger.warn(`🚨 حمله: ${req.path} از ${req.ip}`);
        return res.status(403).json({ error: 'درخواست غیرمجاز' });
    }
    next();
}
app.use(detectAttack);

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'دسترسی غیرمجاز' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            sendAlertToTelegram('WARNING', `⚠️ توکن نامعتبر: ${err.message}`, { ip: req.ip, path: req.path });
            return res.status(403).json({ error: 'توکن نامعتبر' });
        }
        req.user = user;
        next();
    });
}

app.post('/api/register', async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'ایمیل معتبر وارد کنید.' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'رمز عبور حداقل ۶ کاراکتر باشد.' });
    if (!validateName(name)) return res.status(400).json({ error: 'نام معتبر وارد کنید.' });
    const sanitizedEmail = validator.normalizeEmail(email);
    const sanitizedName = sanitizeInput(name);
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.get('SELECT id FROM users WHERE email = ?', [sanitizedEmail], (err, existing) => {
            if (err) return res.status(500).json({ error: 'خطای داخلی' });
            if (existing) return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
            db.run('INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
                [sanitizedEmail, sanitizedName, hashedPassword],
                function(err) {
                    if (err) return res.status(500).json({ error: 'خطا در ثبت‌نام' });
                    const token = jwt.sign({ id: this.lastID, email: sanitizedEmail }, JWT_SECRET, { expiresIn: '7d' });
                    res.status(201).json({ id: this.lastID, email: sanitizedEmail, name: sanitizedName, token, created_at: new Date().toISOString() });
                }
            );
        });
    } catch (error) {
        logger.error('خطا در ثبت‌نام:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند.' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'ایمیل معتبر وارد کنید.' });
    const sanitizedEmail = validator.normalizeEmail(email);
    db.get('SELECT id, email, name, password FROM users WHERE email = ?', [sanitizedEmail], async (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی' });
        if (!user) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
        try {
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ id: user.id, email: user.email, name: user.name, token });
        } catch (error) {
            logger.error('خطا در مقایسه رمز:', error);
            res.status(500).json({ error: 'خطای داخلی سرور' });
        }
    });
});

app.get('/api/user', authenticateToken, (req, res) => {
    db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        res.json(user);
    });
});

app.get('/api/user/:id', authenticateToken, (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId !== req.user.id) return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'خطای داخلی' });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        res.json(user);
    });
});

app.post('/api/ideas', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { content, category, innovation, market, stage } = req.body;
    if (!content || content.trim().length < 5) return res.status(400).json({ error: 'متن ایده حداقل ۵ کاراکتر باشد.' });
    const score = (innovation || 0) * 3 + (market || 0) * 2 + (stage || 0) * 1;
    const sanitizedContent = sanitizeInput(content);
    const sanitizedCategory = sanitizeInput(category || '');
    db.get('SELECT name, email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
        db.run(
            `INSERT INTO ideas (user_id, content, category, innovation, market, stage, score) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, sanitizedContent, sanitizedCategory, innovation || 0, market || 0, stage || 0, score],
            function(err) {
                if (err) {
                    logger.error('خطا در ذخیره ایده:', err);
                    return res.status(500).json({ error: 'خطا در ذخیره ایده' });
                }
                sendToTelegram(user.name, user.email, sanitizedContent);
                res.status(201).json({
                    id: this.lastID,
                    user_id: userId,
                    content: sanitizedContent,
                    category: sanitizedCategory,
                    innovation: innovation || 0,
                    market: market || 0,
                    stage: stage || 0,
                    score: score,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            }
        );
    });
});

app.get('/api/ideas/score/:id', authenticateToken, (req, res) => {
    const ideaId = req.params.id;
    const userId = req.user.id;
    db.get(
        'SELECT id, content, category, score, innovation, market, stage, status, created_at FROM ideas WHERE id = ? AND user_id = ?',
        [ideaId, userId],
        (err, idea) => {
            if (err || !idea) return res.status(404).json({ error: 'ایده یافت نشد' });
            res.json(idea);
        }
    );
});

app.get('/api/ideas', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(
        'SELECT id, content, category, score, status, created_at FROM ideas WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, ideas) => {
            if (err) {
                logger.error('خطا در دریافت ایده‌ها:', err);
                return res.status(500).json({ error: 'خطا در دریافت ایده‌ها' });
            }
            res.json(ideas);
        }
    );
});

app.get('/api/idea/:id', (req, res) => {
    const ideaId = req.params.id;
    db.get(
        'SELECT id, content, category, score, status, created_at FROM ideas WHERE id = ? AND status != "rejected"',
        [ideaId],
        (err, idea) => {
            if (err || !idea) return res.status(404).json({ error: 'ایده یافت نشد' });
            res.json(idea);
        }
    );
});

app.post('/api/consultation', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { phone, topic, description } = req.body;
    if (!phone || !topic || !description) return res.status(400).json({ error: 'همه فیلدها الزامی هستند.' });
    db.get('SELECT name, email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
        db.run(
            'INSERT INTO consultations (user_id, phone, topic, description) VALUES (?, ?, ?, ?)',
            [userId, phone, topic, description],
            function(err) {
                if (err) {
                    logger.error('خطا در ذخیره مشاوره:', err);
                    return res.status(500).json({ error: 'خطا در ثبت درخواست' });
                }
                const msg = `🆕 درخواست مشاوره جدید!\n👤 نام: ${user.name}\n📧 ایمیل: ${user.email}\n📱 شماره: ${phone}\n📌 موضوع: ${topic}\n💬 توضیحات:\n${description}`;
                sendToTelegram(user.name, user.email, msg);
                res.status(201).json({ message: '✅ درخواست مشاوره با موفقیت ثبت شد.' });
            }
        );
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || 'خطای داخلی سرور';
    logger.error(`❌ ${statusCode} - ${message} - ${req.path} - ${req.ip}`);
    if (statusCode >= 500) {
        sendAlertToTelegram('ERROR', message, {
            ip: req.ip,
            path: req.path,
            user: req.user?.email || 'مهمان',
            stack: err.stack,
        });
    }
    res.status(statusCode).json({ error: message });
});

app.listen(PORT, () => {
    console.log(`🚀 سرور روی پورت ${PORT} در حال اجرا است.`);
});
