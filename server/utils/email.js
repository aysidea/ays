const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationEmail(toEmail, userName, code) {
    const htmlContent = `
        <div style="direction:rtl; font-family: Vazir, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px 20px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
            <h2 style="text-align:center; color:#8B5CF6;">موسسه آیس</h2>
            <p style="font-size:16px; color:#1e293b;">سلام ${userName}،</p>
            <p style="font-size:16px; color:#1e293b;">کد تأیید شما برای ثبت‌نام در <strong>آیس</strong>:</p>
            <div style="background: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 2px dashed #8B5CF6;">
                <span style="font-size: 32px; font-weight: 900; color: #8B5CF6; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="font-size:14px; color:#64748b;">این کد تا ۵ دقیقه اعتبار دارد.</p>
            <p style="font-size:14px; color:#64748b;">اگر درخواست ثبت‌نام نداده‌اید، این پیام را نادیده بگیرید.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size:12px; color:#94a3b8; text-align:center;">موسسه آیس | AYS</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"موسسه آیس" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'کد تأیید ثبت‌نام در آیس',
        html: htmlContent
    });
}

module.exports = { sendVerificationEmail };
