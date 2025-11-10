const nodemailer = require('nodemailer');
const SENDER_EMAIL = process.env.EMAIL_USER || 'your_email@gmail.com'; 
const SENDER_PASSWORD = process.env.EMAIL_PASS || 'your_app_password'; 
const SENDER_NAME = process.env.EMAIL_SENDER_NAME || 'Hệ thống Quản lý CLB FPT';

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: SENDER_EMAIL,
        pass: SENDER_PASSWORD,
    },
});

/**
 * Gửi email chung cho ứng dụng
 */
const sendMail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: to,
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("ỗi khi gửi email:", error);
        return false; 
    }
};

module.exports = {
    sendMail,
};