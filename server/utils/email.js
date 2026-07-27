const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendVerificationEmail(to, code) {
  await transporter.sendMail({
    from: `"AYS" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'کد تایید ثبت‌نام در AYS',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; direction: rtl; text-align: right; padding: 24px; background: #f5f0eb; border-radius: 16px;">
        <h2 style="color: #b8957a;">🎯 کد تایید شما</h2>
        <p style="font-size: 1.1rem;">کد زیر را در سایت وارد کنید:</p>
        <div style="background: #fff; padding: 16px; border-radius: 12px; font-size: 2rem; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 16px 0; color: #3d3a36;">${code}</div>
        <p style="color: #6b6560;">این کد تا ۵ دقیقه اعتبار دارد.</p>
        <hr style="border: none; border-top: 1px solid #e2dbd4;" />
        <p style="font-size: 0.8rem; color: #6b6560;">اگر درخواست نکردی، این ایمیل را نادیده بگیر.</p>
      </div>
    `
  });
}

module.exports = { sendVerificationEmail };
