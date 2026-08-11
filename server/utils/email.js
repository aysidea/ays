const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail(userEmail, userName) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'AYS <onboarding@resend.dev>',
            to: [userEmail],
            subject: 'به خانواده AYS خوش آمدید! 🚀',
            html: `
                <div style="font-family: 'Tahoma', sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 30px; background: #F5F0EB; border-radius: 16px; border: 1px solid #E8E0D8;">
                    <h2 style="color: #E67E22; text-align: center;">به AYS خوش آمدید!</h2>
                    <p style="font-size: 1.05rem; line-height: 2; color: #3D3D3D;">
                        سلام <strong>${userName}</strong>،
                    </p>
                    <p style="font-size: 1rem; line-height: 2; color: #3D3D3D;">
                        خوشحالیم که به خانواده بزرگ AYS پیوستید.
                        همین حالا می‌توانید ایده‌های خلاقانه خود را ثبت کنید و به شرکت‌های بزرگ معرفی کنید.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://ays365.onrender.com" 
                           style="display: inline-block; background: #E67E22; color: #fff; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1rem;">
                            🚀 شروع کنید
                        </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #E8E0D8; margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #6B6B6B; text-align: center;">
                        © ۲۰۲۶ AYS – پلتفرم تبدیل ایده به فرصت
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('❌ خطا در ارسال ایمیل:', error);
            return false;
        }

        console.log('✅ ایمیل خوش‌آمدگویی به', userEmail, 'ارسال شد.');
        return true;
    } catch (error) {
        console.error('❌ خطا در ارسال ایمیل:', error.message);
        return false;
    }
}

module.exports = { sendWelcomeEmail };
