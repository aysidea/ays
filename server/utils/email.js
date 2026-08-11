const nodemailer = require('nodemailer');

// ===== تنظیمات فرستنده =====
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ===== ارسال ایمیل خوش‌آمدگویی =====
async function sendWelcomeEmail(userEmail, userName) {
    try {
        const info = await transporter.sendMail({
            from: `"AYS" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'به خانواده AYS خوش آمدید! 🚀',
            html: `
                <div style="font-family: 'Tahoma', 'Vazir', sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 30px; background: #F5F0EB; border-radius: 16px; border: 1px solid #E8E0D8;">
                    
                    <!-- هدر -->
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h1 style="color: #E67E22; font-size: 2rem; margin: 0;">AYS</h1>
                        <p style="color: #6B6B6B; font-size: 0.9rem; margin: 0;">پلتفرم تبدیل ایده به فرصت</p>
                    </div>

                    <!-- محتوای اصلی -->
                    <h2 style="color: #E67E22; text-align: center; font-size: 1.5rem;">به خانواده AYS خوش آمدید!</h2>
                    
                    <p style="font-size: 1.05rem; line-height: 2; color: #3D3D3D;">
                        سلام <strong>${userName}</strong>،
                    </p>
                    
                    <p style="font-size: 1rem; line-height: 2; color: #3D3D3D;">
                        خوشحالیم که به خانواده بزرگ AYS پیوستید. 
                        همین حالا می‌توانید ایده‌های خلاقانه خود را ثبت کنید و 
                        به شرکت‌های بزرگ معرفی کنید.
                    </p>

                    <!-- دکمه اقدام -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://ays365.onrender.com" 
                           style="display: inline-block; background: #E67E22; color: #fff; padding: 12px 35px; 
                                  text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1rem;
                                  box-shadow: 0 4px 15px rgba(230, 126, 34, 0.3);">
                            🚀 شروع کنید
                        </a>
                    </div>

                    <!-- اطلاعات مفید -->
                    <div style="background: #FDFCF8; border-radius: 12px; padding: 15px 20px; margin: 20px 0; border: 1px solid #E8E0D8;">
                        <p style="font-size: 0.9rem; line-height: 1.8; color: #3D3D3D; margin: 0;">
                            <strong>📌 با AYS می‌توانید:</strong><br />
                            ✅ ایده‌های خود را ثبت کنید<br />
                            ✅ به شرکت‌های بزرگ معرفی شوید<br />
                            ✅ از امتیاز و بازخورد کارشناسان بهره‌مند شوید<br />
                            ✅ آینده خود را بسازید
                        </p>
                    </div>

                    <!-- پاورقی -->
                    <hr style="border: none; border-top: 1px solid #E8E0D8; margin: 20px 0;" />
                    
                    <p style="font-size: 0.85rem; color: #6B6B6B; text-align: center; line-height: 1.8;">
                        اگر این ایمیل توسط شما ارسال نشده است، لطفاً آن را نادیده بگیرید.
                    </p>
                    
                    <p style="font-size: 0.75rem; color: #6B6B6B; text-align: center; margin-top: 10px;">
                        © ۲۰۲۶ AYS – پلتفرم تبدیل ایده به فرصت
                        <br />
                        <a href="https://ays365.onrender.com" style="color: #E67E22; text-decoration: none;">ays365.onrender.com</a>
                    </p>
                </div>
            `
        });

        console.log('✅ ایمیل خوش‌آمدگویی به', userEmail, 'ارسال شد.');
        return true;

    } catch (error) {
        console.error('❌ خطا در ارسال ایمیل به', userEmail, ':', error.message);
        return false;
    }
}

// ===== ارسال ایمیل اطلاع‌رسانی خرید ایده (برای آینده) =====
async function sendIdeaSoldEmail(userEmail, userName, ideaTitle) {
    try {
        await transporter.sendMail({
            from: `"AYS" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: '🎉 ایده شما خریداری شد!',
            html: `
                <div style="font-family: 'Tahoma', 'Vazir', sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 30px; background: #F5F0EB; border-radius: 16px; border: 1px solid #E8E0D8;">
                    <h2 style="color: #E67E22; text-align: center;">🎉 ایده شما خریداری شد!</h2>
                    <p style="font-size: 1.05rem; line-height: 2; color: #3D3D3D;">
                        سلام <strong>${userName}</strong>،
                    </p>
                    <p style="font-size: 1rem; line-height: 2; color: #3D3D3D;">
                        ایده شما با عنوان <strong>"${ideaTitle}"</strong> توسط یکی از شرکت‌های همکار خریداری شد.
                    </p>
                    <p style="font-size: 1rem; line-height: 2; color: #3D3D3D;">
                        به‌زودی یکی از کارشناسان ما برای تکمیل فرآیند با شما تماس خواهند گرفت.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://ays365.onrender.com" 
                           style="display: inline-block; background: #E67E22; color: #fff; padding: 12px 35px; 
                                  text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1rem;">
                            📊 مشاهده ایده‌های من
                        </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #E8E0D8; margin: 20px 0;" />
                    <p style="font-size: 0.75rem; color: #6B6B6B; text-align: center;">
                        © ۲۰۲۶ AYS
                    </p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('خطا در ارسال ایمیل خرید ایده:', error.message);
        return false;
    }
}

// ===== ارسال ایمیل بازیابی رمز عبور (برای آینده) =====
async function sendResetPasswordEmail(userEmail, userName, resetLink) {
    try {
        await transporter.sendMail({
            from: `"AYS" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: '🔐 بازیابی رمز عبور AYS',
            html: `
                <div style="font-family: 'Tahoma', 'Vazir', sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 30px; background: #F5F0EB; border-radius: 16px; border: 1px solid #E8E0D8;">
                    <h2 style="color: #E67E22; text-align: center;">🔐 بازیابی رمز عبور</h2>
                    <p style="font-size: 1.05rem; line-height: 2; color: #3D3D3D;">
                        سلام <strong>${userName}</strong>،
                    </p>
                    <p style="font-size: 1rem; line-height: 2; color: #3D3D3D;">
                        برای بازیابی رمز عبور خود، روی لینک زیر کلیک کنید:
                    </p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${resetLink}" 
                           style="display: inline-block; background: #E67E22; color: #fff; padding: 12px 35px; 
                                  text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1rem;">
                            🔑 بازیابی رمز عبور
                        </a>
                    </div>
                    <p style="font-size: 0.85rem; color: #6B6B6B; text-align: center;">
                        این لینک به مدت ۱ ساعت معتبر است.
                    </p>
                    <hr style="border: none; border-top: 1px solid #E8E0D8; margin: 20px 0;" />
                    <p style="font-size: 0.75rem; color: #6B6B6B; text-align: center;">
                        © ۲۰۲۶ AYS
                    </p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('خطا در ارسال ایمیل بازیابی رمز:', error.message);
        return false;
    }
}

module.exports = {
    sendWelcomeEmail,
    sendIdeaSoldEmail,
    sendResetPasswordEmail
};
